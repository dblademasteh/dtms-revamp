<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Office;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficeOnboardingTest extends TestCase
{
    use RefreshDatabase;

    private function stationUser(): User
    {
        $user = User::factory()->create([
            'role' => UserRole::OFFICE_STATION->value,
            'office_id' => null,
        ]);
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");
        return $user;
    }

    public function test_claimable_lists_only_unclaimed_offices(): void
    {
        $unclaimed = Office::factory()->create(['head_user_id' => null]);
        Office::factory()->create(['head_user_id' => User::factory()->create()->id]);

        $this->stationUser();

        $this->getJson('/api/offices/claimable')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['id' => $unclaimed->id]);
    }

    public function test_station_can_claim_an_unclaimed_office(): void
    {
        $station = $this->stationUser();
        $office = Office::factory()->create(['head_user_id' => null]);

        $this->postJson('/api/my-office/claim', ['office_id' => $office->id])
            ->assertOk()
            ->assertJsonPath('office.id', $office->id);

        $this->assertDatabaseHas('offices', [
            'id' => $office->id,
            'head_user_id' => $station->id,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $station->id,
            'office_id' => $office->id,
        ]);
    }

    public function test_station_cannot_claim_an_already_claimed_office(): void
    {
        $this->stationUser();
        $office = Office::factory()->create(['head_user_id' => User::factory()->create()->id]);

        $this->postJson('/api/my-office/claim', ['office_id' => $office->id])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'This office has already been claimed']);
    }

    public function test_station_can_register_a_new_office(): void
    {
        $station = $this->stationUser();

        $this->postJson('/api/my-office/register', [
            'name' => 'BFP Sample Fire Station',
            'unit_code' => '9.0',
            'office_type' => 'fire_station',
            'description' => 'Test station',
        ])->assertStatus(201)
            ->assertJsonPath('office.name', 'BFP Sample Fire Station')
            ->assertJsonPath('office.office_type', 'fire_station');

        $office = Office::where('name', 'BFP Sample Fire Station')->first();
        $this->assertNotNull($office);
        $this->assertNotNull($office->code);
        $this->assertEquals($station->id, $office->head_user_id);
        $this->assertDatabaseHas('users', [
            'id' => $station->id,
            'office_id' => $office->id,
        ]);
    }

    public function test_linked_station_cannot_claim_or_register_again(): void
    {
        $office = Office::factory()->create();
        $user = User::factory()->create([
            'role' => UserRole::OFFICE_STATION->value,
            'office_id' => $office->id,
        ]);
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");

        $other = Office::factory()->create(['head_user_id' => null]);

        $this->postJson('/api/my-office/claim', ['office_id' => $other->id])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'Your account is already linked to an office']);

        $this->postJson('/api/my-office/register', ['name' => 'Another Station'])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'Your account is already linked to an office']);
    }

    public function test_non_station_account_cannot_claim(): void
    {
        $user = User::factory()->create(['role' => UserRole::OFFICER->value, 'office_id' => null]);
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");

        $office = Office::factory()->create(['head_user_id' => null]);

        $this->postJson('/api/my-office/claim', ['office_id' => $office->id])
            ->assertStatus(403);
    }
}
