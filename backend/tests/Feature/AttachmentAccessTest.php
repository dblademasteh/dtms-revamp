<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Document;
use App\Models\DocumentAttachment;
use App\Models\Office;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Regression coverage for the storage audit fixes:
 *  - #2 attachment reads must honour the document visibility model
 *  - #1 a quota rejection must not leave a file on disk
 *  - #3 deleting a document must remove its physical files
 */
class AttachmentAccessTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");

        return $token;
    }

    private function makeAttachment(Document $document, User $uploader): DocumentAttachment
    {
        $path = 'documents/' . $document->id . '/testfile.pdf';
        Storage::disk('public')->put($path, 'hello world');

        return DocumentAttachment::create([
            'document_id' => $document->id,
            'file_name' => 'secret.pdf',
            'file_path' => $path,
            'file_type' => 'application/pdf',
            'file_size' => 11,
            'file_hash' => hash('sha256', 'hello world'),
            'version' => 1,
            'is_latest' => true,
            'uploaded_by' => $uploader->id,
        ]);
    }

    public function test_unrelated_user_cannot_download_an_attachment(): void
    {
        Storage::fake('public');

        $originator = User::factory()->create(['role' => UserRole::OFFICER]);
        $document = Document::factory()->create(['originator_id' => $originator->id]);
        $attachment = $this->makeAttachment($document, $originator);

        // A different office, no relationship to the document at all.
        $stranger = User::factory()->create([
            'role' => UserRole::NON_OFFICER,
            'office_id' => Office::factory()->create()->id,
        ]);
        $this->token($stranger);

        $this->getJson("/api/documents/{$document->id}/attachments/{$attachment->id}/download")
            ->assertStatus(403);
    }

    public function test_originator_can_download_their_own_attachment(): void
    {
        Storage::fake('public');

        $originator = User::factory()->create(['role' => UserRole::OFFICER]);
        $document = Document::factory()->create(['originator_id' => $originator->id]);
        $attachment = $this->makeAttachment($document, $originator);

        $this->token($originator);

        $this->get("/api/documents/{$document->id}/attachments/{$attachment->id}/download")
            ->assertStatus(200);
    }

    public function test_unrelated_user_cannot_list_attachment_versions(): void
    {
        Storage::fake('public');

        $originator = User::factory()->create(['role' => UserRole::OFFICER]);
        $document = Document::factory()->create(['originator_id' => $originator->id]);
        $attachment = $this->makeAttachment($document, $originator);

        $stranger = User::factory()->create([
            'role' => UserRole::NON_OFFICER,
            'office_id' => Office::factory()->create()->id,
        ]);
        $this->token($stranger);

        $this->getJson("/api/documents/{$document->id}/attachments/{$attachment->id}/versions")
            ->assertStatus(403);
    }

    public function test_quota_rejection_does_not_write_a_file_to_disk(): void
    {
        Storage::fake('public');

        $office = Office::factory()->create([
            'storage_quota_bytes' => 1000,
        ]);
        $originator = User::factory()->create([
            'role' => UserRole::OFFICER,
            'office_id' => $office->id,
        ]);
        $document = Document::factory()->create(['originator_id' => $originator->id]);

        $this->token($originator);

        // A non-image file takes the uncompressed path, which is the branch
        // that used to write to disk before the quota check ran.
        $file = UploadedFile::fake()->create('big.pdf', 200, 'application/pdf');

        $response = $this->post("/api/documents/{$document->id}/attachments", [
            'file' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('file');

        $this->assertSame(0, count(Storage::disk('public')->allFiles('documents/' . $document->id)));
        $this->assertSame(0, DocumentAttachment::where('document_id', $document->id)->count());
    }

    public function test_upload_within_quota_creates_the_file_and_row(): void
    {
        Storage::fake('public');

        $office = Office::factory()->create([
            'storage_quota_bytes' => 10 * 1024 * 1024,
        ]);
        $originator = User::factory()->create([
            'role' => UserRole::OFFICER,
            'office_id' => $office->id,
        ]);
        $document = Document::factory()->create(['originator_id' => $originator->id]);

        $this->token($originator);

        $file = UploadedFile::fake()->create('ok.pdf', 20, 'application/pdf');

        $response = $this->post("/api/documents/{$document->id}/attachments", [
            'file' => $file,
        ]);

        $response->assertStatus(201);

        $attachment = DocumentAttachment::where('document_id', $document->id)->firstOrFail();
        Storage::disk('public')->assertExists($attachment->file_path);

        // The stored path must match the recorded path, and live under documents/.
        $this->assertStringStartsWith('documents/' . $document->id . '/', $attachment->file_path);
    }

    public function test_deleting_a_document_removes_its_files_from_disk(): void
    {
        Storage::fake('public');

        $originator = User::factory()->create(['role' => UserRole::OFFICER]);
        $document = Document::factory()->create([
            'originator_id' => $originator->id,
            'status' => 'created',
        ]);
        $attachment = $this->makeAttachment($document, $originator);

        $path = $attachment->file_path;
        Storage::disk('public')->assertExists($path);

        $admin = User::factory()->create(['role' => UserRole::SUPERADMIN]);
        $this->token($admin);

        $this->deleteJson("/api/documents/{$document->id}")->assertStatus(200);

        Storage::disk('public')->assertMissing($path);
        $this->assertSame(0, DocumentAttachment::where('document_id', $document->id)->count());
    }
}