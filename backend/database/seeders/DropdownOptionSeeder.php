<?php

namespace Database\Seeders;

use App\Models\DropdownOption;
use Illuminate\Database\Seeder;

class DropdownOptionSeeder extends Seeder
{
    /**
     * Default option values per group, shared with the group-reset endpoint.
     * Each entry: [value, label, meta|null].
     */
    public static function defaults(): array
    {
        return [
            'document_types' => [
                ['memorandum', 'Memorandum'],
                ['memorandum_circular', 'Memorandum Circular'],
                ['endorsement', 'Endorsement'],
                ['special_order', 'Special Order'],
                ['travel_order', 'Travel Order'],
                ['communication', 'Communication'],
                ['referral', 'Referral'],
                ['resolution', 'Resolution'],
                ['ordinance', 'Ordinance'],
                ['purchase_request', 'Purchase Request'],
                ['job_order', 'Job Order'],
                ['advisory', 'Advisory'],
                ['request', 'Request / Letter'],
                ['fsic_application', 'FSIC Application'],
                ['fire_investigation_report', 'Fire Investigation Report'],
                ['incident_report', 'Fire Incident Report'],
                ['inspection_report', 'Inspection Report'],
                ['training_request', 'Training Request'],
                ['others', 'Others'],
            ],
            'classifications' => [
                ['public', 'Public'],
                ['official', 'Official'],
                ['restricted', 'Restricted'],
                ['confidential', 'Confidential'],
            ],
            'modes_of_transmittal' => [
                ['hand_carried', 'Hand-carried'],
                ['registered_mail', 'Registered Mail'],
                ['courier', 'Courier'],
                ['email_fax', 'Email / Fax'],
                ['internal', 'Internal (Inter-Office)'],
            ],
            'action_requested' => [
                ['approval_signature', 'APPROVAL/SIGNATURE'],
                ['appropriate_staff_action', 'APPROPRIATE STAFF ACTION'],
                ['comment_recommendation', 'COMMENT/RECOMMENDATION'],
                ['study_investigation', 'STUDY/INVESTIGATION'],
                ['reply_direct_to_writer', 'REPLY DIRECT TO WRITER'],
                ['reply_for_signature_of', 'REPLY FOR SIGNATURE OF'],
                ['rewrite_redraft', 'REWRITE/REDRAFT'],
                ['notation_information', 'NOTATION/INFORMATION'],
                ['dissemination', 'DISSEMINATION'],
                ['see_me_call_me', 'SEE ME/CALL ME'],
                ['dispatch', 'DISPATCH'],
                ['file', 'FILE'],
            ],
            'routing_dispositions' => [
                ['approved', 'Approved', 'approve'],
                ['forwarded', 'Forwarded', 'approve'],
                ['rejected', 'Declined', 'reject'],
                ['disapproved', 'Disapproved', 'reject'],
                ['returned', 'Returned', 'return'],
                ['referred', 'Referred', 'return'],
                ['filed', 'Filed', 'file'],
            ],
            'document_statuses' => [
                ['created', 'Created'],
                ['received', 'Received'],
                ['in_review', 'In Review'],
                ['approved', 'Approved'],
                ['rejected', 'Declined'],
                ['returned', 'Returned'],
                ['released', 'Released'],
                ['filed', 'Filed'],
            ],
            'office_types' => [
                ['regional_office', 'Regional Office'],
                ['provincial_office', 'Provincial Office'],
                ['fire_station', 'Fire Station'],
                ['division', 'Division'],
                ['unit', 'Unit'],
                ['others', 'Others'],
            ],
            'ranks' => [
                ['FCSUPT', 'FCSUPT - Fire Chief Superintendent'],
                ['FSSUPT', 'FSSUPT - Fire Senior Superintendent'],
                ['FSUPT', 'FSUPT - Fire Superintendent'],
                ['FCINSP', 'FCINSP - Fire Chief Inspector'],
                ['FSINSP', 'FSINSP - Fire Senior Inspector'],
                ['FINSP', 'FINSP - Fire Inspector'],
                ['SFO4', 'SFO4 - Senior Fire Officer 4'],
                ['SFO3', 'SFO3 - Senior Fire Officer 3'],
                ['SFO2', 'SFO2 - Senior Fire Officer 2'],
                ['SFO1', 'SFO1 - Senior Fire Officer 1'],
                ['FO3', 'FO3 - Fire Officer 3'],
                ['FO2', 'FO2 - Fire Officer 2'],
                ['FO1', 'FO1 - Fire Officer 1'],
                ['NUP', 'NUP - Non-Uniformed Personnel'],
            ],
            'designations' => [
                ['Officer-in-Charge (OIC)', 'Officer-in-Charge (OIC)'],
            ],
            'priorities' => [
                ['low', 'Low', ['desc' => 'Standard processing']],
                ['normal', 'Normal', ['desc' => 'Default priority']],
                ['high', 'High', ['desc' => 'Expedited processing']],
                ['urgent', 'Urgent', ['desc' => 'Immediate attention']],
            ],
            'agencies' => [
                ['pnp', 'PNP - Philippine National Police'],
                ['bjmp', 'BJMP - Bureau of Jail Management and Penology'],
                ['csc', 'CSC - Civil Service'],
                ['doj', 'DOJ - Justice'],
                ['dotr', 'DOTr - Transportation'],
                ['other', 'Other Agency'],
            ],
            'suggestion_categories' => [
                ['feature', 'Feature'],
                ['improvement', 'Improvement'],
                ['bug', 'Bug'],
                ['other', 'Other'],
            ],
            'suggestion_statuses' => [
                ['open', 'Open'],
                ['under_review', 'Under Review'],
                ['planned', 'Planned'],
                ['implemented', 'Implemented'],
                ['closed', 'Closed'],
            ],
        ];
    }

    public function run(): void
    {
        $this->seed();
    }

    public static function seed(): void
    {
        foreach (self::defaults() as $group => $items) {
            foreach ($items as $i => $item) {
                [$value, $label] = $item;
                $meta = $item[2] ?? null;
                DropdownOption::updateOrCreate(
                    ['group' => $group, 'value' => $value],
                    ['label' => $label, 'meta' => $meta, 'sort_order' => $i, 'is_active' => true]
                );
            }
        }
    }
}
