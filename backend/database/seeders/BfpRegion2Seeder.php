<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Office;
use App\Models\User;
use App\Models\RoutingTemplate;
use Illuminate\Support\Facades\Hash;
use App\Enums\UserRole;

class BfpRegion2Seeder extends Seeder
{
    private array $offices = [];

    public function run(): void
    {
        $this->seedOffices();
        $this->seedFireStations();
        $this->seedUsers();
        $this->seedTemplates();

        echo "BFP Region 2 (Cagayan Valley) offices seeded successfully!\n";
        echo "Superadmin login: dcitmbfpro02@gmail.com\n";
    }

    private function office(string $code, string $name, ?string $parentCode, string $description, string $type = 'division'): Office
    {
        $parentId = $parentCode ? $this->offices[$parentCode]->id : null;

        // Extract the leading organizational unit code (e.g. "5.1a ", "17.0 ")
        // and keep the office name clean of numeric identifiers.
        preg_match('/^[\d.]+(?:[a-z])?\s+/i', $name, $matches);
        $unitCode = $matches ? trim($matches[0]) : null;
        $cleanName = preg_replace('/^[\d.]+(?:[a-z])?\s+/i', '', $name);

        $office = Office::firstOrCreate(
            ['code' => $code],
            [
                'name' => $cleanName,
                'unit_code' => $unitCode,
                'parent_office_id' => $parentId,
                'description' => $description,
                'office_type' => $type,
                'status' => 'active',
            ]
        );

        // Keep the hierarchy in sync on re-runs
        if ($office->parent_office_id !== $parentId) {
            $office->update(['parent_office_id' => $parentId]);
        }
        if ($office->office_type !== $type) {
            $office->update(['office_type' => $type]);
        }
        if ($office->unit_code !== $unitCode) {
            $office->update(['unit_code' => $unitCode]);
        }

        $this->offices[$code] = $office;
        return $office;
    }

    private function user(string $email, string $password, array $attributes): User
    {
        return User::firstOrCreate(['email' => $email], array_merge([
            'password' => Hash::make($password),
            'status' => 'active',
            'profile_setup_complete' => true,
        ], $attributes));
    }

    private function seedOffices(): void
    {
        // Regional Office (root)
        $this->office('BFP-R2', 'BFP Region 2 (Cagayan Valley) Regional Office', null,
            'Regional Office of the Bureau of Fire Protection, Cagayan Valley, with seat at Tuguegarao City, Cagayan.', 'regional_office');

        // ===== Former division / section / unit offices, flattened directly under the Regional Office =====
        $r2 = 'BFP-R2';
        $this->office('BFP-R2-ORD', '1.0 Office of the Regional Director (ORD)', $r2, 'Office of the Regional Director (ORD), head of BFP Region 2.', 'division');
        $this->office('BFP-R2-RESFO', '1.1 Regional Enlisted Senior Fire Officer (RESFO)', $r2, 'Regional Enlisted Senior Fire Officer.', 'unit');
        $this->office('BFP-R2-OIA', '1.2 Office of the Internal Affairs (OIA)', $r2, 'Office of the Internal Affairs.', 'division');
        $this->office('BFP-R2-OIA-IS', '1.2a Investigation Section (IS)', $r2, 'Investigation Section.', 'unit');
        $this->office('BFP-R2-OIA-CRSS', '1.2b Case Research and Support Section (CRSS)', $r2, 'Case Research and Support Section.', 'unit');
        $this->office('BFP-R2-OIA-ProS', '1.2c Prosecution Section (ProS)', $r2, 'Prosecution Section.', 'unit');
        $this->office('BFP-R2-OIA-CoRS', '1.2d Conflict Resolution Section (CoRS)', $r2, 'Conflict Resolution Section.', 'unit');
        $this->office('BFP-R2-OIA-IAMS', '1.2e Internal Affairs Management Section (IAMS)', $r2, 'Internal Affairs Management Section.', 'unit');
        $this->office('BFP-R2-HO', '1.3 Hearing Office (HO)', $r2, 'Hearing Office.', 'division');
        $this->office('BFP-R2-IAuO', '1.4 Internal Audit Office (IAuO)', $r2, 'Internal Audit Office.', 'division');
        $this->office('BFP-R2-ARDA', '2.0 Assistant Regional Director for Administration (ARDA)', $r2, 'Assistant Regional Director for Administration.', 'division');
        $this->office('BFP-R2-ARDO', '3.0 Assistant Regional Director for Operation (ARDO)', $r2, 'Assistant Regional Director for Operation.', 'division');
        $this->office('BFP-R2-RCS', '4.0 Regional Chief of Staff (RCS)', $r2, 'Regional Chief of Staff.', 'division');
        $this->office('BFP-R2-AD', '5.0 Administrative Division (AD)', $r2, 'Administrative Division.', 'division');
        $this->office('BFP-R2-HRMS', '5.1 Human Resource Management Section (HRMS)', $r2, 'Human Resource Management Section.', 'division');
        $this->office('BFP-R2-HRMS-RU', '5.1a Recruitment Unit (RU)', $r2, 'Recruitment Unit.', 'unit');
        $this->office('BFP-R2-HRMS-PPPU', '5.1b Promotion and Personnel Placement Unit (PPPU)', $r2, 'Promotion and Personnel Placement Unit.', 'unit');
        $this->office('BFP-R2-HRMS-MSTU', '5.1c Mandatory and Special Training Unit (MSTU)', $r2, 'Mandatory and Special Training Unit.', 'unit');
        $this->office('BFP-R2-PRS', '5.2 Personnel Records Section (PRS)', $r2, 'Personnel Records Section.', 'division');
        $this->office('BFP-R2-PRS-PAU', '5.2a Personnel Accounting Unit (PAU)', $r2, 'Personnel Accounting Unit.', 'unit');
        $this->office('BFP-R2-PRS-RLMU', '5.2b Records and Leave Management Unit (RLMU)', $r2, 'Records and Leave Management Unit.', 'unit');
        $this->office('BFP-R2-MBS', '5.3 Morale and Benefits Section (MBS)', $r2, 'Morale and Benefits Section.', 'division');
        $this->office('BFP-R2-MBS-ABU', '5.3a Awards and Benefits Unit (ABU)', $r2, 'Awards and Benefits Unit.', 'unit');
        $this->office('BFP-R2-MBS-PWRBU', '5.3b Personnel Welfare and Retirement Benefits Unit (PWRBU)', $r2, 'Personnel Welfare and Retirement Benefits Unit.', 'unit');
        $this->office('BFP-R2-FMD', '6.0 Financial Management Division (FMD)', $r2, 'Financial Management Division.', 'division');
        $this->office('BFP-R2-BS', '6.1 Budget Section (BS)', $r2, 'Budget Section.', 'division');
        $this->office('BFP-R2-AS', '6.2 Accounting Section (AS)', $r2, 'Accounting Section.', 'division');
        $this->office('BFP-R2-FDS', '6.3 Financial Disbursement Section (FDS)', $r2, 'Financial Disbursement Section.', 'division');
        $this->office('BFP-R2-PPD', '7.0 Planning and Programming Division (PPD)', $r2, 'Planning and Programming Division.', 'division');
        $this->office('BFP-R2-PS', '7.1 Planning Section (PS)', $r2, 'Planning Section.', 'division');
        $this->office('BFP-R2-MES', '7.2 Monitoring and Evaluation Section (MES)', $r2, 'Monitoring and Evaluation Section.', 'division');
        $this->office('BFP-R2-SMS', '7.3 Strategy Management Section (SMS)', $r2, 'Strategy Management Section.', 'division');
        $this->office('BFP-R2-LD', '8.0 Logistics Division (LD)', $r2, 'Logistics Division.', 'division');
        $this->office('BFP-R2-LD-SMS', '8.1 Supply Management Section (SMS)', $r2, 'Supply Management Section.', 'division');
        $this->office('BFP-R2-LD-SMS-LPPU', '8.1a Logistics Planning and Programming Unit (LPPU)', $r2, 'Logistics Planning and Programming Unit.', 'unit');
        $this->office('BFP-R2-LD-SMS-CACU', '8.1b Contract Administration and Claims Unit (CACU)', $r2, 'Contract Administration and Claims Unit.', 'unit');
        $this->office('BFP-R2-ES', '8.2 Engineering Section (ES)', $r2, 'Engineering Section.', 'division');
        $this->office('BFP-R2-ES-IREMU', '8.2a Infrastructure and Real Estate Management Unit (IREMU)', $r2, 'Infrastructure and Real Estate Management Unit.', 'unit');
        $this->office('BFP-R2-ES-MVMU', '8.2b Motor Vehicle Management Unit (MVMU)', $r2, 'Motor Vehicle Management Unit.', 'unit');
        $this->office('BFP-R2-ES-IADMU', '8.2c Inventory, Appraisal, and Disposal Management Unit (IADMU)', $r2, 'Inventory, Appraisal, and Disposal Management Unit.', 'unit');
        $this->office('BFP-R2-BACSS', '8.3 Bids and Award Committee Support Section (BACSS)', $r2, 'Bids and Award Committee Support Section.', 'division');
        $this->office('BFP-R2-BACSS-POU', '8.3a Procurement Operations Unit (POU)', $r2, 'Procurement Operations Unit.', 'unit');
        $this->office('BFP-R2-BACSS-PMCU', '8.3b Procurement Monitoring and Compliance Unit (PMCU)', $r2, 'Procurement Monitoring and Compliance Unit.', 'unit');
        $this->office('BFP-R2-FSEPD', '9.0 Fire Safety Enforcement and Prevention Division (FSEPD)', $r2, 'Fire Safety Enforcement and Prevention Division.', 'division');
        $this->office('BFP-R2-CRS', '9.1 Community Relations Section (CRS)', $r2, 'Community Relations Section.', 'division');
        $this->office('BFP-R2-FSMS', '9.2 Fire Safety Management Section (FSMS)', $r2, 'Fire Safety Management Section.', 'division');
        $this->office('BFP-R2-OD', '10.0 Operations Division (OD)', $r2, 'Operations Division.', 'division');
        $this->office('BFP-R2-IIS', '10.1 Intelligence and Investigation Section (IIS)', $r2, 'Intelligence and Investigation Section.', 'division');
        $this->office('BFP-R2-IIS-InvU', '10.1a Investigation Unit (InvU)', $r2, 'Investigation Unit.', 'unit');
        $this->office('BFP-R2-IIS-IntU', '10.1b Intelligence Unit (IntU)', $r2, 'Intelligence Unit.', 'unit');
        $this->office('BFP-R2-SOS', '10.2 Special Operations Section (SOS)', $r2, 'Special Operations Section.', 'division');
        $this->office('BFP-R2-FSOS', '10.3 Fire Suppression Operations Section (FSOS)', $r2, 'Fire Suppression Operations Section.', 'division');
        $this->office('BFP-R2-FCOS', '10.4 Fire Communications Operations Section (FCOS)', $r2, 'Fire Communications Operations Section.', 'division');
        $this->office('BFP-R2-LS', '11.0 Legal Service (LS)', $r2, 'Legal Service.', 'division');
        $this->office('BFP-R2-PIS', '12.0 Public Information Service (PIS)', $r2, 'Public Information Service.', 'division');
        $this->office('BFP-R2-MRS', '12.1 Media Relations Section (MRS)', $r2, 'Media Relations Section.', 'division');
        $this->office('BFP-R2-DS', '12.2 Documentation Section (DS)', $r2, 'Documentation Section.', 'division');
        $this->office('BFP-R2-CHS', '13.0 Chaplain Service (CHS)', $r2, 'Chaplain Service.', 'division');
        $this->office('BFP-R2-HS', '14.0 Health Service (HS)', $r2, 'Health Service.', 'division');
        $this->office('BFP-R2-HS-MS', '14.1 Medical Section (MS)', $r2, 'Medical Section.', 'division');
        $this->office('BFP-R2-HS-DS', '14.2 Dental Section (DS)', $r2, 'Dental Section.', 'division');
        $this->office('BFP-R2-HS-TRS', '14.3 Therapeutic Rehabilitation Section (TRS)', $r2, 'Therapeutic Rehabilitation Section.', 'division');
        $this->office('BFP-R2-HS-HMS', '14.4 Health Management Section (HMS)', $r2, 'Health Management Section.', 'division');
        $this->office('BFP-R2-SPAS', '15.0 Supply and Property Accountable Service (SPAS)', $r2, 'Supply and Property Accountable Service.', 'division');
        $this->office('BFP-R2-TS', '16.0 Training Service (TS)', $r2, 'Training Service.', 'division');
        $this->office('BFP-R2-TS-PRS', '16.1 Personnel and Records Section (PRS)', $r2, 'Personnel and Records Section.', 'division');
        $this->office('BFP-R2-TS-BFS', '16.2 Budget and Finance Section (BFS)', $r2, 'Budget and Finance Section.', 'division');
        $this->office('BFP-R2-TS-LS', '16.3 Logistics Section (LS)', $r2, 'Logistics Section.', 'division');
        $this->office('BFP-R2-ICTS', '17.0 ICT Service (ICTS)', $r2, 'ICT Service.', 'division');
        $this->office('BFP-R2-SRF', '18.0 Special Rescue Force (SRF) - Clustered', $r2, 'Special Rescue Force.', 'division');
        $this->office('BFP-R2-SRF-RC', '18.1 Rescue Company', $r2, 'Rescue Company.', 'unit');
        $this->office('BFP-R2-SRF-HC', '18.2 HAZMAT/CBRNE Company', $r2, 'HAZMAT/CBRNE Company.', 'unit');
        $this->office('BFP-R2-SRF-MP', '18.3 Maritime Platoon', $r2, 'Maritime Platoon.', 'unit');
        $this->office('BFP-R2-SPS', '19.0 Security and Protection Service (SPS)', $r2, 'Security and Protection Service.', 'division');

        // Provincial Offices
        $this->office('BFP-CAG', 'BFP Cagayan', 'BFP-R2', 'Provincial Office - Cagayan.', 'provincial_office');
        $this->office('BFP-ISA', 'BFP Isabela', 'BFP-R2', 'Provincial Office - Isabela.', 'provincial_office');
        $this->office('BFP-NV', 'BFP Nueva Vizcaya', 'BFP-R2', 'Provincial Office - Nueva Vizcaya.', 'provincial_office');
        $this->office('BFP-QZN', 'BFP Quirino', 'BFP-R2', 'Provincial Office - Quirino.', 'provincial_office');
        $this->office('BFP-BTN', 'BFP Batanes', 'BFP-R2', 'Provincial Office - Batanes.', 'provincial_office');

        // City fire station (referenced by a seeded user below)
        $this->office('BFP-TUG', 'Tuguegarao City Fire Station', 'BFP-CAG', 'City Fire Station - Tuguegarao City, Cagayan.', 'fire_station');
    }

    private function seedFireStations(): void
    {
        $provinceNames = [
            'BFP-BTN' => 'Batanes',
            'BFP-CAG' => 'Cagayan',
            'BFP-ISA' => 'Isabela',
            'BFP-NV'  => 'Nueva Vizcaya',
            'BFP-QZN' => 'Quirino',
        ];

        // Municipalities per province
        $municipalities = [
            'BFP-BTN' => ['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan'],
            'BFP-CAG' => [
                'Abulug', 'Alcala', 'Alliance', 'Amulung', 'Aparri', 'Baggao', 'Ballesteros',
                'Buguey', 'Calayan', 'Camalaniugan', 'Claveria', 'Enrile', 'Gattaran', 'Gonzaga',
                'Iguig', 'Lal-lo', 'Lasam', 'Pamplona', 'Peñablanca', 'Piat', 'Rizal',
                'Sanchez-Mira', 'Santa Ana', 'Santa Praxedes', 'Santa Teresita', 'Santo Niño',
                'Solana', 'Tuao',
            ],
            'BFP-ISA' => [
                'Alicia', 'Angadanan', 'Aurora', 'Benito Soliven', 'Burgos', 'Cabagan', 'Cabatuan',
                'Cordon', 'Delfin Albano', 'Dinapigue', 'Divilacan', 'Echague', 'Gamu', 'Jones',
                'Luna', 'Maconacon', 'Mallig', 'Naguilian', 'Palanan', 'Quezon', 'Quirino',
                'Ramon', 'Reina Mercedes', 'Roxas', 'San Agustin', 'San Guillermo', 'San Isidro',
                'San Manuel', 'San Mariano', 'San Mateo', 'San Pablo', 'Santa Maria', 'Santo Tomas',
                'Tumauini',
            ],
            'BFP-NV' => [
                'Alfonso Castañeda', 'Ambaguio', 'Aritao', 'Bagabag', 'Bambang', 'Bayombong',
                'Diadi', 'Dupax del Norte', 'Dupax del Sur', 'Kasibu', 'Kayapa', 'Quezon',
                'Santa Fe', 'Solano', 'Villaverde',
            ],
            'BFP-QZN' => ['Aglipay', 'Cabarroguis', 'Diffun', 'Maddela', 'Nagtipunan', 'Saguday'],
        ];

        // Component/independent cities per province (handled as city fire stations)
        $cities = [
            'BFP-CAG' => [],
            'BFP-ISA' => ['Cauayan', 'Ilagan', 'Santiago'],
        ];

        $slug = fn (string $name) => strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', $name));

        foreach ($municipalities as $provCode => $towns) {
            $province = $provinceNames[$provCode];
            foreach ($towns as $town) {
                $code = $provCode . '-FS-' . $slug($town);
                $this->office($code, $town . ' Fire Station', $provCode,
                    'Municipal Fire Station - ' . $town . ', ' . $province . '.', 'fire_station');
            }
        }

        foreach ($cities as $provCode => $towns) {
            $province = $provinceNames[$provCode];
            foreach ($towns as $city) {
                $code = $provCode . '-FS-' . $slug($city);
                $this->office($code, $city . ' City Fire Station', $provCode,
                    'City Fire Station - ' . $city . ', ' . $province . '.', 'fire_station');
            }
        }
    }

    private function seedUsers(): void
    {
        $regionalId = $this->offices['BFP-R2']->id;

        // The real superadmin account (only user created by the seeder)
        $admin = $this->user('dcitmbfpro02@gmail.com', '@dmiN123', [
            'name' => 'Rani Bryan Pasinos',
            'first_name' => 'Rani Bryan',
            'last_name' => 'Pasinos',
            'role' => UserRole::SUPERADMIN,
            'office_id' => $regionalId,
            'designation' => 'System Administrator',
            'rank' => 'FO3',
            'accnt_no' => 'P15024',
            'phone' => '+63 917 123 4567',
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);
        $this->offices['BFP-R2']->update(['head_user_id' => $admin->id]);
        if (method_exists($admin, 'markEmailAsVerified') && !$admin->hasVerifiedEmail()) {
            $admin->markEmailAsVerified();
        }
    }

    private function template(string $name, string $documentType, string $description, array $steps): void
    {
        if (RoutingTemplate::where('name', $name)->exists()) {
            return;
        }

        $mapped = array_map(fn ($s) => [
            'office_id' => $this->offices[$s['office']]->id,
            'role' => $s['role'],
            'action' => $s['action'],
        ], $steps);

        RoutingTemplate::create([
            'name' => $name,
            'document_type' => $documentType,
            'description' => $description,
            'steps' => $mapped,
            'is_active' => true,
            'created_by' => $this->offices['BFP-R2']->head_user_id,
        ]);
    }

    private function seedTemplates(): void
    {
        $this->template('FSIC Application Routing', 'fsic_application',
            'Fire Safety Inspection Certificate (FSIC) application: Regional Records -> Regional Review -> Regional Sign',
            [
                ['office' => 'BFP-R2', 'role' => 'records_officer', 'action' => 'receive'],
                ['office' => 'BFP-R2', 'role' => 'approver', 'action' => 'inspect'],
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'sign'],
            ]);

        $this->template('Administrative Memorandum', 'memorandum',
            'Administrative memorandum: Regional Review -> Regional Sign',
            [
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'review'],
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'sign'],
            ]);

        $this->template('Travel Order', 'travel_order',
            'Travel Order: Regional Review -> Regional Approve -> Regional Sign',
            [
                ['office' => 'BFP-R2', 'role' => 'approver', 'action' => 'review'],
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'approve'],
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'sign'],
            ]);

        $this->template('Fire Investigation Report', 'fire_investigation_report',
            'Fire Investigation Report: Regional Review -> Regional Endorse -> Regional Approve',
            [
                ['office' => 'BFP-R2', 'role' => 'approver', 'action' => 'review'],
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'endorse'],
                ['office' => 'BFP-R2', 'role' => 'division_head', 'action' => 'approve'],
            ]);
    }
}
