<?php

namespace App\Services;

use App\Models\Office;

class PersonnelOfficeResolver
{
    /**
     * Map roster unit assignments to office codes for units whose names do not
     * literally match the offices table (regional sections/divisions and the
     * provincial fire marshal offices).
     */
    private const UNIT_TO_CODE = [
        'Accounting Section, FMD, BFP RO2' => 'BFP-R2-AS',
        'Administrative Division, BFP RO2' => 'BFP-R2-AD',
        'Bids & Awards Committee Support Section, Logistics Division, BFP RO2' => 'BFP-R2-BACSS',
        'Budget Section, FMD, BFP RO2' => 'BFP-R2-BS',
        'Community Relations Section, FSEPD, BFP RO2' => 'BFP-R2-CRS',
        'Dental Section, Health Service, BFP RO2' => 'BFP-R2-HS-DS',
        'Document Section, PIS, BFP RO2' => 'BFP-R2-DS',
        'Engineering Section, Logistics Division, BFP RO2' => 'BFP-R2-ES',
        'Financial Disbursement Section, FMD, BFP RO2' => 'BFP-R2-FDS',
        'Financial Management Division, BFP RO2' => 'BFP-R2-FMD',
        'Fire Communications Operations Section, Operations Division, BFP RO2' => 'BFP-R2-FCOS',
        'Fire Safety Enforcement and Prevention Division, BFP RO2' => 'BFP-R2-FSEPD',
        'Fire Safety Management Section, BFP RO2' => 'BFP-R2-FSMS',
        'Fire Safety Management Section, FSEPD, BFP RO2' => 'BFP-R2-FSMS',
        'Fire Suppression Operations Section, Operations Division, BFP RO2' => 'BFP-R2-FSOS',
        'Health Management Section, Health Service, BFP RO2' => 'BFP-R2-HS-HMS',
        'Health Service, BFP RO2' => 'BFP-R2-HS',
        'Hearing Office, BFP RO2' => 'BFP-R2-HO',
        'Human Resource Management Section, Admin Div, BFP RO2' => 'BFP-R2-HRMS',
        'ICT Service, BFP RO2' => 'BFP-R2-ICTS',
        'Intelligence and Investigation Section, Operations Division, BFP RO2' => 'BFP-R2-IIS',
        'Legal Service, BFP RO2' => 'BFP-R2-LS',
        'Logistics Division, BFP RO2' => 'BFP-R2-LD',
        'Media Relations Section, PIS, BFP RO2' => 'BFP-R2-MRS',
        'Medical Section, Health Service, BFP RO2' => 'BFP-R2-HS-MS',
        'Monitoring and Evaluation Section, PPD, BFP RO2' => 'BFP-R2-MES',
        'Morale and Benefits Section, Admin Div, BFP RO2' => 'BFP-R2-MBS',
        'OIA, BFP RO2' => 'BFP-R2-OIA',
        'OPFM, Batanes' => 'BFP-BTN',
        'OPFM, Cagayan' => 'BFP-CAG',
        'OPFM, Isabela' => 'BFP-ISA',
        'OPFM, Nueva Vizcaya' => 'BFP-NV',
        'OPFM, Quirino' => 'BFP-QZN',
        'Office of Internal Affairs, BFP RO2' => 'BFP-R2-OIA',
        'Office of the ARDA, BFP RO2' => 'BFP-R2-ARDA',
        'Office of the ARDO, BFP RO2' => 'BFP-R2-ARDO',
        'Office of the Regional Chief of Staff, BFP RO2' => 'BFP-R2-RCS',
        'Operations Division, BFP RO2' => 'BFP-R2-OD',
        'Personnel Records Section, Admin Div, BFP RO2' => 'BFP-R2-PRS',
        'Planning Section, PPD, BFP RO2' => 'BFP-R2-PS',
        'Planning and Programming Division, BFP RO2' => 'BFP-R2-PPD',
        'Public Information Service, BFP RO2' => 'BFP-R2-PIS',
        'Special Operations Section, Operations Division, BFP RO2' => 'BFP-R2-SOS',
        'Special Rescue Force, BFP RO2' => 'BFP-R2-SRF',
        'Strategy Management Section, PPD, BFP RO2' => 'BFP-R2-SMS',
        'Supply Management Section, Logistics Division, BFP RO2' => 'BFP-R2-LD-SMS',
        'Therapeutic and Rehabilitation Section, Health Service, BFP RO2' => 'BFP-R2-HS-TRS',
    ];

    /**
     * Resolve the office for a roster unit assignment string.
     */
    public function resolveForUnit(?string $unitAssignment): ?Office
    {
        if (!$unitAssignment) {
            return null;
        }

        $unit = trim($unitAssignment);

        // 1. Explicit mapping for regional/OPFM units
        if (isset(self::UNIT_TO_CODE[$unit])) {
            return Office::where('code', self::UNIT_TO_CODE[$unit])->first();
        }

        // 2. Exact name match against the offices table (fire stations, etc.)
        return Office::where('name', $unit)->first();
    }

    /**
     * Resolve the office id for a roster unit assignment string.
     */
    public function resolveForUnitId(?string $unitAssignment): ?int
    {
        return $this->resolveForUnit($unitAssignment)?->id;
    }
}
