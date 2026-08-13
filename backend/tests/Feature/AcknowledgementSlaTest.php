<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Office;
use App\Models\Document;
use App\Models\DocumentAcknowledgment;
use App\Enums\DocumentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcknowledgementSlaTest extends TestCase
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

    public function test_create_with_require_ack_creates_pending_acknowledgement(): void
    {
        $originator = $this->authenticate();
        $recipient = User::factory()->create();

        $response = $this->postJson('/api/documents', [
            'document_type' => 'memorandum',
            'subject' => 'Needs Acknowledgement',
            'priority' => 'normal',
            'classification' => 'official',
            'require_ack' => true,
            'recipient_type' => 'personnel',
            'recipient_id' => $recipient->id,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('document_acknowledgements', [
            'document_id' => $response->json('document.id'),
            'user_id' => $recipient->id,
            'required' => true,
        ]);
        $this->assertDatabaseMissing('document_acknowledgements', [
            'document_id' => $response->json('document.id'),
            'user_id' => $originator->id,
        ]);
    }

    public function test_recipient_can_acknowledge_and_originator_is_notified(): void
    {
        $originator = User::factory()->create(['office_id' => Office::factory()->create()->id]);
        $recipient = User::factory()->create(['office_id' => Office::factory()->create()->id]);

        $doc = Document::factory()->create([
            'status' => DocumentStatus::RECEIVED->value,
            'originator_id' => $originator->id,
            'current_office_id' => $recipient->office_id,
            'recipient_type' => 'personnel',
            'recipient_id' => $recipient->id,
            'require_ack' => true,
        ]);

        DocumentAcknowledgment::create([
            'document_id' => $doc->id,
            'user_id' => $recipient->id,
            'office_id' => null,
            'required' => true,
        ]);

        $this->authenticate($recipient);

        $response = $this->postJson("/api/documents/{$doc->id}/acknowledge");
        $response->assertStatus(200)
            ->assertJsonPath('acknowledgement.user_id', $recipient->id)
            ->assertJsonPath('acknowledgement.acknowledged_at', fn ($v) => $v !== null);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $originator->id,
            'type' => 'ack_confirmed',
        ]);
    }

    public function test_unrelated_user_cannot_view_acknowledgements(): void
    {
        $this->authenticate();
        $doc = Document::factory()->create();

        $response = $this->getJson("/api/documents/{$doc->id}/acknowledgements");
        $response->assertStatus(403);
    }

    public function test_sla_check_sends_overdue_and_escalation_notifications(): void
    {
        $office = Office::factory()->create();
        $head = User::factory()->create(['office_id' => $office->id]);
        $office->head_user_id = $head->id;
        $office->save();
        $holder = User::factory()->create(['office_id' => $office->id]);
        $super = User::factory()->superadmin()->create();

        Document::factory()->create([
            'status' => DocumentStatus::RECEIVED->value,
            'due_at' => now()->subHours(30),
            'current_office_id' => $office->id,
            'recipient_type' => 'personnel',
            'recipient_id' => $holder->id,
        ]);

        $this->artisan('sla:check')->assertExitCode(0);

        $this->assertDatabaseHas('notifications', ['user_id' => $holder->id, 'type' => 'doc_overdue']);
        $this->assertDatabaseHas('notifications', ['user_id' => $head->id, 'type' => 'doc_escalated']);
        $this->assertDatabaseHas('notifications', ['user_id' => $super->id, 'type' => 'doc_escalated']);

        // Idempotent — re-running must not re-notify.
        $this->artisan('sla:check')->assertExitCode(0);
        $this->assertDatabaseCount('notifications', 3);
    }

    public function test_sla_check_sends_due_soon_notification(): void
    {
        $office = Office::factory()->create();
        $holder = User::factory()->create(['office_id' => $office->id]);

        Document::factory()->create([
            'status' => DocumentStatus::RECEIVED->value,
            'due_at' => now()->addHours(20),
            'current_office_id' => $office->id,
            'recipient_type' => 'personnel',
            'recipient_id' => $holder->id,
        ]);

        $this->artisan('sla:check')->assertExitCode(0);

        $this->assertDatabaseHas('notifications', ['user_id' => $holder->id, 'type' => 'doc_due_soon']);
    }

    public function test_sla_check_reminds_pending_acknowledgers_after_24h(): void
    {
        $office = Office::factory()->create();
        $head = User::factory()->create(['office_id' => $office->id]);
        $office->head_user_id = $head->id;
        $office->save();
        $doc = Document::factory()->create();

        $ack = new DocumentAcknowledgment([
            'document_id' => $doc->id,
            'user_id' => $head->id,
            'office_id' => $office->id,
            'required' => true,
        ]);
        $ack->created_at = now()->subHours(25);
        $ack->save();

        $this->artisan('sla:check')->assertExitCode(0);

        $this->assertDatabaseHas('notifications', ['user_id' => $head->id, 'type' => 'ack_request']);
    }
}
