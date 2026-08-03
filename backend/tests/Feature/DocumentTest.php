<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Office;
use App\Models\Document;
use App\Models\RoutingTemplate;
use App\Enums\DocumentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): User
    {
        $office = Office::factory()->create();
        $user = User::factory()->create(['office_id' => $office->id]);
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");
        return $user;
    }

    private function createTemplate(User $user, Office $office, int $steps = 2): RoutingTemplate
    {
        $stepList = [];
        for ($i = 0; $i < $steps; $i++) {
            $stepList[] = [
                'office_id' => $office->id,
                'role' => 'approver',
                'action' => 'approve',
                'sla_hours' => 24,
            ];
        }
        return RoutingTemplate::create([
            'name' => 'Test Template',
            'document_type' => 'memorandum',
            'steps' => $stepList,
            'is_active' => true,
            'created_by' => $user->id,
        ]);
    }

    public function test_can_create_document(): void
    {
        $user = $this->authenticate();
        $template = $this->createTemplate($user, $user->office);

        $response = $this->postJson('/api/documents', [
            'document_type' => 'memorandum',
            'subject' => 'Test Document',
            'priority' => 'normal',
            'classification' => 'confidential',
            'routing_template_id' => $template->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'document']);
    }

    public function test_can_list_documents(): void
    {
        $this->authenticate();
        Document::factory()->count(3)->create();

        $response = $this->getJson('/api/documents');
        $response->assertStatus(200);
    }

    public function test_can_show_document(): void
    {
        $this->authenticate();
        $doc = Document::factory()->create();

        $response = $this->getJson("/api/documents/{$doc->id}");
        $response->assertStatus(200)
            ->assertJsonPath('id', $doc->id);
    }

    public function test_document_routing_advances_step(): void
    {
        $user = $this->authenticate();
        $template = $this->createTemplate($user, $user->office, 3);
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RECEIVED,
            'current_step' => 0,
            'routing_template_id' => $template->id,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'approved',
            'remarks' => 'Approved',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'current_step' => 1,
        ]);
    }

    public function test_government_verb_action_advances_step(): void
    {
        $user = $this->authenticate();
        $template = $this->createTemplate($user, $user->office, 3);
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RECEIVED,
            'current_step' => 0,
            'routing_template_id' => $template->id,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'signed',
            'remarks' => 'Signed and endorsed',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'current_step' => 1,
        ]);
        $this->assertDatabaseHas('routing_history', [
            'document_id' => $doc->id,
            'action' => 'approved',
            'disposition' => 'signed',
        ]);
    }

    public function test_invalid_routing_action_is_rejected(): void
    {
        $user = $this->authenticate();
        $template = $this->createTemplate($user, $user->office, 3);
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RECEIVED,
            'current_step' => 0,
            'routing_template_id' => $template->id,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'frobnicate',
            'remarks' => 'Nope',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_set_mode_of_transmittal_on_create(): void
    {
        $user = $this->authenticate();
        $template = $this->createTemplate($user, $user->office);

        $response = $this->postJson('/api/documents', [
            'document_type' => 'memorandum',
            'subject' => 'Transmitted Document',
            'priority' => 'normal',
            'classification' => 'confidential',
            'mode_of_transmittal' => 'registered_mail',
            'routing_template_id' => $template->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('document.mode_of_transmittal', 'registered_mail');
    }

    public function test_cannot_delete_released_document(): void
    {
        $user = $this->authenticate();
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RELEASED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->deleteJson("/api/documents/{$doc->id}");
        $response->assertStatus(422);
    }

    public function test_can_file_released_document(): void
    {
        $user = $this->authenticate();
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RELEASED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'filed',
            'remarks' => 'Filed for archival',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => DocumentStatus::FILED->value,
        ]);
        $this->assertDatabaseHas('routing_history', [
            'document_id' => $doc->id,
            'action' => 'filed',
            'disposition' => 'filed',
        ]);
    }

    public function test_cannot_file_non_released_document(): void
    {
        $user = $this->authenticate();
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RECEIVED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'filed',
            'remarks' => 'Should fail',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => DocumentStatus::RECEIVED->value,
        ]);
    }

    public function test_created_document_starts_as_created_with_originator(): void
    {
        $user = $this->authenticate();
        $template = $this->createTemplate($user, $user->office);

        $response = $this->postJson('/api/documents', [
            'document_type' => 'memorandum',
            'subject' => 'Draft Document',
            'priority' => 'normal',
            'classification' => 'official',
            'recipient_type' => 'office',
            'recipient_id' => $user->office_id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('document.status', DocumentStatus::CREATED->value)
            ->assertJsonPath('document.current_office_id', $user->office_id);

        $this->assertDatabaseHas('routing_history', [
            'document_id' => $response->json('document.id'),
            'action' => 'created',
            'to_office_id' => $user->office_id,
        ]);
    }

    public function test_can_send_created_document_to_recipient(): void
    {
        $user = $this->authenticate();
        $targetOffice = Office::factory()->create();
        $doc = Document::factory()->create([
            'status' => DocumentStatus::CREATED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
            'recipient_type' => 'office',
            'recipient_id' => $targetOffice->id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'routed',
            'remarks' => 'Sending for action',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => DocumentStatus::RECEIVED->value,
            'current_office_id' => $targetOffice->id,
        ]);
        $this->assertDatabaseHas('routing_history', [
            'document_id' => $doc->id,
            'action' => 'routed',
            'to_office_id' => $targetOffice->id,
        ]);
    }

    public function test_cannot_send_received_document(): void
    {
        $user = $this->authenticate();
        $doc = Document::factory()->create([
            'status' => DocumentStatus::RECEIVED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'routed',
            'remarks' => 'Should fail',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => DocumentStatus::RECEIVED->value,
        ]);
    }

    public function test_can_send_created_document_to_personnel_without_office(): void
    {
        $user = $this->authenticate();
        $targetUser = User::factory()->create(['office_id' => null]);
        $doc = Document::factory()->create([
            'status' => DocumentStatus::CREATED,
            'originator_id' => $user->id,
            'current_office_id' => $user->office_id,
            'recipient_type' => 'personnel',
            'recipient_id' => $targetUser->id,
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/route", [
            'action' => 'routed',
            'remarks' => 'Sending to office-less personnel',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('documents', [
            'id' => $doc->id,
            'status' => DocumentStatus::RECEIVED->value,
            'current_office_id' => $user->office_id,
            'recipient_type' => 'personnel',
            'recipient_id' => $targetUser->id,
        ]);
        $this->assertDatabaseHas('routing_history', [
            'document_id' => $doc->id,
            'action' => 'routed',
            'to_office_id' => $user->office_id,
        ]);
    }

    public function test_created_documents_do_not_appear_in_for_me_inbox(): void
    {
        $user = $this->authenticate();
        Document::factory()->create([
            'status' => DocumentStatus::CREATED,
            'recipient_type' => 'personnel',
            'recipient_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);
        Document::factory()->create([
            'status' => DocumentStatus::RECEIVED,
            'recipient_type' => 'personnel',
            'recipient_id' => $user->id,
            'current_office_id' => $user->office_id,
        ]);

        $response = $this->getJson('/api/documents?for_me=true');
        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('total'));
    }

    public function test_can_create_comment(): void
    {
        $this->authenticate();
        $doc = Document::factory()->create();

        $response = $this->postJson("/api/documents/{$doc->id}/comments", [
            'body' => 'Test comment',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('comment.body', 'Test comment');
    }

    public function test_my_documents_filter(): void
    {
        $user = $this->authenticate();
        Document::factory()->count(2)->create(['originator_id' => $user->id]);
        Document::factory()->count(3)->create();

        $response = $this->getJson('/api/documents?mine=true');
        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('total'));
    }

    public function test_admin_can_update_default_sla(): void
    {
        $office = Office::factory()->create();
        $admin = \App\Models\User::factory()->administrator()->create(['office_id' => $office->id]);
        $token = $admin->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");

        $response = $this->putJson('/api/admin/settings', ['default_sla_hours' => 72]);
        $response->assertStatus(200)
            ->assertJsonPath('settings.default_sla_hours', 72);
    }

    public function test_non_admin_cannot_update_settings(): void
    {
        $this->authenticate();

        $response = $this->putJson('/api/admin/settings', ['default_sla_hours' => 72]);
        $response->assertStatus(403);
    }
}
