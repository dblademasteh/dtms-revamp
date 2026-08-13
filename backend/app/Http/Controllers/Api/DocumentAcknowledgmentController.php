<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAcknowledgment;
use App\Models\Notification;
use App\Models\User;
use App\Events\NotificationCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentAcknowledgmentController extends Controller
{
    public function index(Request $request, Document $document)
    {
        $user = $request->user();

        $canView = $user->isAdmin()
            || !empty($user->can_view_all_documents)
            || in_array(is_object($user->role) ? $user->role->value : $user->role, ['superadmin', 'fcos'], true)
            || $document->originator_id === $user->id
            || $document->current_office_id === $user->office_id;

        if (!$canView) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $acknowledgements = $document->acknowledgements()
            ->with(['user' => fn ($q) => $q->select('id', 'name', 'rank', 'first_name', 'last_name', 'middle_name'), 'office'])
            ->orderBy('created_at')
            ->get();

        return response()->json($acknowledgements);
    }

    public function acknowledge(Request $request, Document $document)
    {
        $user = $request->user();
        $userId = $user->id;
        $officeId = $user->office_id;

        // Track "seen" for any pending acknowledgement aimed at this user/office.
        $document->acknowledgements()
            ->whereNull('acknowledged_at')
            ->where(function ($q) use ($userId, $officeId) {
                $q->where('user_id', $userId);
                if ($officeId) {
                    $q->orWhere('office_id', $officeId);
                }
            })
            ->update(['seen_at' => now()]);

        $ack = DB::transaction(function () use ($document, $userId, $officeId) {
            $record = DocumentAcknowledgment::where('document_id', $document->id)
                ->where('user_id', $userId)
                ->first();

            if (!$record && $officeId) {
                $record = DocumentAcknowledgment::where('document_id', $document->id)
                    ->whereNull('user_id')
                    ->where('office_id', $officeId)
                    ->first();
            }

            if (!$record) {
                $record = DocumentAcknowledgment::create([
                    'document_id' => $document->id,
                    'user_id' => $userId,
                    'office_id' => $officeId,
                    'required' => true,
                ]);
            }

            if (!$record->acknowledged_at) {
                $record->update(['acknowledged_at' => now(), 'seen_at' => now()]);
            }

            return $record;
        });

        if ($ack->user_id && $ack->user_id !== $document->originator_id) {
            $originator = $document->originator;
            if ($originator) {
                $notification = Notification::create([
                    'user_id' => $originator->id,
                    'type' => 'ack_confirmed',
                    'title' => 'Document Acknowledged',
                    'message' => $user->full_name . " acknowledged the document \"{$document->subject}\" ({$document->tracking_number}).",
                    'channel' => 'in_app',
                    'sent_at' => now(),
                    'data' => ['document_id' => $document->id, 'tracking_number' => $document->tracking_number, 'subject' => $document->subject],
                ]);
                NotificationCreated::dispatch(
                    $notification->id,
                    $notification->user_id,
                    $notification->type,
                    $notification->title,
                    $notification->message,
                    $notification->data,
                );
            }
        }

        return response()->json([
            'message' => 'Document acknowledged',
            'acknowledgement' => $ack->fresh(['user' => fn ($q) => $q->select('id', 'name', 'first_name', 'last_name', 'middle_name', 'rank'), 'office']),
        ]);
    }
}
