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
}
