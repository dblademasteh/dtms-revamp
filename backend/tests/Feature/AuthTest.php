<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Office;
use App\Models\RoutingTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'office_id' => $office->id,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_user_cannot_login_with_wrong_password(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'office_id' => $office->id,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_forgot_password_generates_token(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'office_id' => $office->id,
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'dev_token']);
    }

    public function test_reset_password_changes_password(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'office_id' => $office->id,
        ]);

        $token = 'sometoken123';
        \DB::table('password_reset_tokens')->insert([
            'email' => 'test@example.com',
            'token' => $token,
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'test@example.com',
            'token' => $token,
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ]);

        $response->assertStatus(200);
        $this->assertTrue(\Hash::check('newpassword', $user->fresh()->password));
    }

    public function test_user_can_update_designation(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create(['office_id' => $office->id]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/auth/profile', [
                'designation' => 'OIC, ICTS',
            ]);

        $response->assertStatus(200);
        $this->assertSame('OIC, ICTS', $user->fresh()->designation);
    }

    public function test_user_can_update_office_assignment(): void
    {
        $oldOffice = Office::factory()->create();
        $newOffice = Office::factory()->create();
        $user = User::factory()->create(['office_id' => $oldOffice->id]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/auth/profile', [
                'office_id' => $newOffice->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.office_id', $newOffice->id);
        $this->assertSame($newOffice->id, $user->fresh()->office_id);
    }

    public function test_office_id_is_cleared_when_set_to_null(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create(['office_id' => $office->id]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/auth/profile', [
                'office_id' => null,
            ]);

        $response->assertStatus(200);
        $this->assertNull($user->fresh()->office_id);
    }

    public function test_office_id_resolved_from_unit_assignment_when_omitted(): void
    {
        $office = Office::factory()->create(['name' => 'ICT Service, BFP RO2', 'code' => 'BFP-R2-ICTS']);
        $user = User::factory()->create(['office_id' => null]);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/auth/profile', [
                'unit_assignment' => 'ICT Service, BFP RO2',
            ]);

        $response->assertStatus(200);
        $this->assertSame($office->id, $user->fresh()->office_id);
    }
}
