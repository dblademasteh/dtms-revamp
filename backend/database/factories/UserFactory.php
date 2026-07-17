<?php

namespace Database\Factories;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => bcrypt('password'),
            'role' => UserRole::NON_OFFICER->value,
            'phone' => fake()->phoneNumber(),
            'status' => 'active',
            'email_verified_at' => now(),
        ];
    }

    public function superadmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::SUPERADMIN->value,
        ]);
    }
}
