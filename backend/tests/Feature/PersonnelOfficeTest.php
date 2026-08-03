<?php

namespace Tests\Feature;

use App\Models\Office;
use App\Models\User;
use App\Services\PersonnelOfficeResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class PersonnelOfficeTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolver_maps_regional_unit_assignment_by_code(): void
    {
        $office = Office::factory()->create(['code' => 'BFP-R2-ICTS', 'name' => 'ICT Service (ICTS)']);

        $resolved = (new PersonnelOfficeResolver)->resolveForUnit('ICT Service, BFP RO2');

        $this->assertNotNull($resolved);
        $this->assertEquals($office->id, $resolved->id);
    }

    public function test_resolver_maps_opfm_unit_assignment(): void
    {
        $office = Office::factory()->create(['code' => 'BFP-BTN', 'name' => 'Office of the Provincial Fire Marshal Batanes']);

        $resolved = (new PersonnelOfficeResolver)->resolveForUnit('OPFM, Batanes');

        $this->assertNotNull($resolved);
        $this->assertEquals($office->id, $resolved->id);
    }

    public function test_resolver_matches_fire_station_by_exact_name(): void
    {
        $office = Office::factory()->create(['code' => 'BFP-CAG-FS-ABULUG', 'name' => 'Abulug FS, Cagayan']);

        $resolved = (new PersonnelOfficeResolver)->resolveForUnit('Abulug FS, Cagayan');

        $this->assertNotNull($resolved);
        $this->assertEquals($office->id, $resolved->id);
    }

    public function test_resolver_returns_null_for_unknown_unit(): void
    {
        $this->assertNull((new PersonnelOfficeResolver)->resolveForUnit('Nonexistent Unit'));
        $this->assertNull((new PersonnelOfficeResolver)->resolveForUnit(null));
    }

    public function test_import_assigns_office_id_from_unit_assignment(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}");
        $office = Office::factory()->create(['code' => 'BFP-R2-ICTS', 'name' => 'ICT Service (ICTS)']);

        $csv = "rank,last_name,first_name,middle_name,item_no,accnt_no,unit_assignment,designation,email\n"
            . 'FO3,Palchan,Joy Carol,Awing,P17105,P17105,"ICT Service, BFP RO2",C,Records Unit' . "\n";

        $response = $this->postJson('/api/personnel/import', [
            'file' => UploadedFile::fake()->createWithContent('roster.csv', $csv),
        ]);
        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'accnt_no' => 'P17105',
            'office_id' => $office->id,
        ]);
    }
}
