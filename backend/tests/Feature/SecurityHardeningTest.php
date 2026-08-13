<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Office;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(User $user = null): User
    {
        if (!$user) {
            $office = Office::factory()->create();
            $user = User::factory()->create(['office_id' => $office->id]);
        }
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");
        return $user;
    }

    public function test_flagged_user_is_blocked_on_protected_routes(): void
    {
        $user = $this->authenticate();
        $user->update(['must_change_password' => true]);

        $response = $this->getJson('/api/documents');
        $response->assertStatus(403)
            ->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
    }

    public function test_flagged_user_can_reach_exempt_auth_routes(): void
    {
        $user = $this->authenticate();
        $user->update(['must_change_password' => true]);

        $this->getJson('/api/auth/me')->assertStatus(200);
    }

    public function test_change_password_clears_must_change_password_flag(): void
    {
        $user = $this->authenticate();
        $user->update(['must_change_password' => true]);

        $response = $this->putJson('/api/auth/password', [
            'current_password' => 'password',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ]);

        $response->assertStatus(200);
        $this->assertFalse((bool) $user->fresh()->must_change_password);
    }

    public function test_unrelated_user_cannot_view_document(): void
    {
        $this->authenticate();
        $otherOffice = Office::factory()->create();
        $doc = Document::factory()->create(['current_office_id' => $otherOffice->id]);

        $response = $this->getJson("/api/documents/{$doc->id}");
        $response->assertStatus(403);
    }

    public function test_recipient_personnel_can_view_document(): void
    {
        $recipient = $this->authenticate();
        $doc = Document::factory()->create([
            'recipient_type' => 'personnel',
            'recipient_id' => $recipient->id,
        ]);

        $this->getJson("/api/documents/{$doc->id}")->assertStatus(200);
    }

    public function test_public_document_is_visible_to_any_authenticated_user(): void
    {
        $this->authenticate();
        $doc = Document::factory()->create(['is_public' => true]);

        $this->getJson("/api/documents/{$doc->id}")->assertStatus(200);
    }

    public function test_originator_can_export_pdf(): void
    {
        $user = $this->authenticate();
        $doc = Document::factory()->create([
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->getJson("/api/documents/{$doc->id}/pdf");
        $response->assertStatus(200)
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_unrelated_user_cannot_export_pdf(): void
    {
        $this->authenticate();
        $otherOffice = Office::factory()->create();
        $doc = Document::factory()->create(['current_office_id' => $otherOffice->id]);

        $this->getJson("/api/documents/{$doc->id}/pdf")->assertStatus(403);
    }

    public function test_unrelated_user_cannot_update_document(): void
    {
        $this->authenticate();
        $otherOffice = Office::factory()->create();
        $doc = Document::factory()->create(['current_office_id' => $otherOffice->id]);

        $response = $this->putJson("/api/documents/{$doc->id}", ['subject' => 'Hacked']);
        $response->assertStatus(403);
    }

    public function test_cannot_create_document_with_nonexistent_office_recipient(): void
    {
        $user = $this->authenticate();

        $response = $this->postJson('/api/documents', [
            'document_type' => 'memorandum',
            'subject' => 'Bad Recipient',
            'priority' => 'normal',
            'classification' => 'official',
            'recipient_type' => 'office',
            'recipient_id' => 99999,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.recipient_id.0', 'The selected recipient does not exist.');
        $this->assertDatabaseMissing('documents', ['subject' => 'Bad Recipient']);
    }

    public function test_cannot_route_created_document_to_nonexistent_office(): void
    {
        $user = $this->authenticate();
        $targetOffice = Office::factory()->create();
        $doc = Document::factory()->create([
            'status' => \App\Enums\DocumentStatus::CREATED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
            'recipient_type' => 'office',
            'recipient_id' => $targetOffice->id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'routed',
            'remarks' => 'Sending to a missing office',
            'recipient_type' => 'office',
            'recipient_id' => 99999,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.recipient_id.0', 'The selected recipient does not exist.');
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => \App\Enums\DocumentStatus::CREATED->value,
        ]);
    }

    public function test_route_to_nonexistent_office_user_recipient_returns_422(): void
    {
        $user = $this->authenticate();
        $doc = Document::factory()->create([
            'status' => \App\Enums\DocumentStatus::CREATED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'routed',
            'remarks' => 'Sending to a missing user',
            'recipient_type' => 'personnel',
            'recipient_id' => 99999,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.recipient_id.0', 'The selected recipient does not exist.');
    }
}
