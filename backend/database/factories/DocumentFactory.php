<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\User;
use App\Models\Office;
use App\Enums\DocumentStatus;
use App\Enums\DocumentPriority;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    protected $model = Document::class;

    public function definition(): array
    {
        $office = Office::factory()->create();
        $user = User::factory()->create(['office_id' => $office->id]);
        return [
            'tracking_number' => 'DOC-' . fake()->unique()->numerify('#######'),
            'document_type' => 'memorandum',
            'subject' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'priority' => DocumentPriority::NORMAL->value,
            'status' => DocumentStatus::CREATED->value,
            'classification' => 'official',
            'mode_of_transmittal' => 'internal',
            'originator_id' => $user->id,
            'current_office_id' => $office->id,
        ];
    }
}
