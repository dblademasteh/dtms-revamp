<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Office;
use App\Models\RoutingHistory;
use App\Models\AuditTrail;
use App\Models\DocumentAttachment;
use App\Models\DocumentComment;
use App\Enums\DocumentStatus;
use App\Events\DocumentStatusChanged;
use App\Events\NotificationCreated;
use App\Support\ImageProcessor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Mail\DocumentNotification;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = Document::with(['originator', 'currentOffice', 'routingTemplate']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('document_type')) {
            $query->where('document_type', $request->document_type);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('office_id')) {
            $query->where('current_office_id', $request->office_id);
        }

        if ($request->has('personnel_id')) {
            $query->where('originator_id', $request->personnel_id);
        }

        if ($request->boolean('mine')) {
            $query->where('originator_id', $request->user()->id);
        }

        if ($request->boolean('for_me')) {
            $userId = $request->user()->id;
            $officeId = $request->user()->office_id;
            $query->where(function ($q) use ($userId, $officeId) {
                $q->where(function ($q2) use ($userId) {
                    $q2->where('recipient_type', 'personnel')
                        ->where('recipient_id', $userId);
                })->orWhere(function ($q2) use ($officeId) {
                    $q2->where('recipient_type', 'office')
                        ->where('recipient_id', $officeId);
                });
            })->where('status', '!=', DocumentStatus::CREATED->value);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        if ($request->has('from_date')) {
            $query->where('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->where('created_at', '<=', $request->to_date);
        }

        if ($request->has('is_public')) {
            $query->where('is_public', filter_var($request->is_public, FILTER_VALIDATE_BOOLEAN));
        }

        $documents = $query->orderBy('created_at', 'desc')
                         ->paginate($request->get('per_page', 15));

        return response()->json($documents);
    }

    public function store(Request $request)
    {
        $request->validate([
            'document_type' => 'required|string|max:100|in:' . implode(',', array_keys(\App\Models\Document::DOCUMENT_TYPES)),
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'classification' => 'nullable|in:' . implode(',', array_keys(\App\Models\Document::CLASSIFICATIONS)),
            'mode_of_transmittal' => 'nullable|in:' . implode(',', array_keys(\App\Models\Document::MODES_OF_TRANSMITTAL)),
            'action_requested' => 'nullable|string|max:100',
            'routing_template_id' => 'nullable|exists:routing_templates,id',
            'recipient_type' => 'nullable|in:office,personnel',
            'recipient_id' => 'nullable|integer',
            'cc_list' => 'nullable|array',
            'cc_list.*' => 'string',
            'bcc_list' => 'nullable|array',
            'bcc_list.*' => 'string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        DB::beginTransaction();

        $skippedDuplicates = [];

        try {
            // Determine the originator's office (the document stays here until sent)
            $fromOfficeId = $request->user()->office_id
                ?? \App\Models\Office::query()->value('id');

            // Parse cc_list and bcc_list from "type:id" format to structured data
            $parseList = function ($list) {
                return array_map(function ($item) {
                    [$type, $id] = explode(':', $item);
                    return ['type' => $type, 'id' => (int) $id];
                }, $list ?? []);
            };
            $ccList = $parseList($request->cc_list);
            $bccList = $parseList($request->bcc_list);

            $document = Document::create([
                'tracking_number' => Document::generateTrackingNumber($request->user()->office?->code),
                'document_type' => $request->document_type,
                'subject' => $request->subject,
                'description' => $request->description,
                'priority' => $request->priority ?? 'normal',
                'classification' => $request->classification ?? 'official',
                'mode_of_transmittal' => $request->mode_of_transmittal,
                'action_requested' => $request->action_requested,
                'status' => DocumentStatus::CREATED,
                'originator_id' => $request->user()->id,
                'current_office_id' => $fromOfficeId,
                'routing_template_id' => $request->routing_template_id,
                'current_step' => 0,
                'recipient_type' => $request->recipient_type,
                'recipient_id' => $request->recipient_id,
                'cc_list' => $ccList,
                'bcc_list' => $bccList,
                'sla_deadline' => now()->addHours(\App\Models\SystemSetting::getDefaultSlaHours()),
            ]);

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $result = $this->storeVersionedAttachment($document, $file, $request->user()->id);
                    if ($result['duplicate']) {
                        $skippedDuplicates[] = $file->getClientOriginalName();
                    }
                }
            }

            RoutingHistory::create([
                'document_id' => $document->id,
                'from_office_id' => $fromOfficeId,
                'to_office_id' => $fromOfficeId,
                'action' => 'created',
                'remarks' => 'Document created and awaiting routing',
                'actor_id' => $request->user()->id,
                'step_number' => 1,
                'timestamp' => now(),
            ]);

            AuditTrail::create([
                'document_id' => $document->id,
                'user_id' => $request->user()->id,
                'action' => 'created',
                'description' => 'Document created',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            DB::commit();

            DocumentStatusChanged::dispatch(
                $document->id,
                $document->tracking_number,
                $document->subject,
                $document->status->value,
                'created',
                $request->user()->id,
                $request->user()->name,
            );

            $message = 'Document created successfully';
            if (!empty($skippedDuplicates)) {
                $message .= ' (' . count($skippedDuplicates) . ' duplicate file(s) skipped: ' . implode(', ', $skippedDuplicates) . ')';
            }

            return response()->json([
                'message' => $message,
                'document' => $document->load(['originator', 'currentOffice', 'attachments']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function show(\Illuminate\Http\Request $request, Document $document)
    {
        $with = [
            'originator',
            'currentOffice',
            'routingTemplate',
            'latestAttachments.uploader',
            'routingHistory.actor',
            'routingHistory.fromOffice',
            'routingHistory.toOffice',
            'comments.user',
        ];

        if ($request->user() && $request->user()->isAdmin()) {
            $with['auditTrails.user'] = function ($query) {
                $query->latest();
            };
        }

        $document->load($with);

        if ($document->recipient_id) {
            if ($document->recipient_type === 'personnel') {
                $document->setRelation('recipient', \App\Models\User::find($document->recipient_id));
            } else {
                $document->setRelation('recipient', \App\Models\Office::find($document->recipient_id));
            }
        }

        // Load CC and BCC users (supports both personnel and office entries)
        $loadRecipients = function (array $list): array {
            $users = [];
            foreach ($list as $entry) {
                if (($entry['type'] ?? '') === 'personnel') {
                    $u = \App\Models\User::find($entry['id'] ?? null);
                    if ($u) $users[] = $u;
                } else {
                    $office = \App\Models\Office::with('head')->find($entry['id'] ?? null);
                    if ($office && $office->head) $users[] = $office->head;
                }
            }
            return $users;
        };

        if ($document->cc_list) {
            $document->setRelation('cc_users', collect($loadRecipients($document->cc_list)));
        }
        if ($document->bcc_list) {
            $document->setRelation('bcc_users', collect($loadRecipients($document->bcc_list)));
        }

        return response()->json($document);
    }

    public function update(Request $request, Document $document)
    {
        $request->validate([
            'subject' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'sometimes|in:low,normal,high,urgent',
            'classification' => 'sometimes|in:' . implode(',', array_keys(\App\Models\Document::CLASSIFICATIONS)),
            'mode_of_transmittal' => 'sometimes|in:' . implode(',', array_keys(\App\Models\Document::MODES_OF_TRANSMITTAL)),
        ]);

        $document->update($request->only(['subject', 'description', 'priority', 'classification', 'mode_of_transmittal', 'action_requested']));

        return response()->json([
            'message' => 'Document updated successfully',
            'document' => $document->refresh(),
        ]);
    }

    public function route(Request $request, Document $document)
    {
        $request->validate([
            'action' => 'required|in:' . implode(',', \App\Models\Document::routingActionVerbs()),
            'to_office_id' => 'required_if:action,returned,referred,resubmitted|exists:offices,id',
            'remarks' => 'required|string|max:500',
            'attachment' => 'nullable|file|max:10240',
        ]);

        $action = $request->input('action');
        $transition = \App\Models\Document::transitionFor($action);

        if ($transition === 'file' && $document->status !== DocumentStatus::RELEASED) {
            return response()->json(['message' => 'Only released documents can be filed'], 422);
        }

        DB::beginTransaction();

        try {
            $oldStatus = $document->status;
            $canonicalAction = \App\Models\Document::canonicalAction($transition);

            if ($transition === 'approve') {
                $nextStep = $document->current_step + 1;
                $templateSteps = $document->routingTemplate?->steps ?? [];
                $isLastStep = empty($templateSteps) || $nextStep >= count($templateSteps);

                $document->update([
                    'current_step' => $nextStep,
                    'status' => $isLastStep ? DocumentStatus::APPROVED : DocumentStatus::IN_REVIEW,
                ]);

                RoutingHistory::create([
                    'document_id' => $document->id,
                    'from_office_id' => $document->current_office_id,
                    'to_office_id' => $document->current_office_id,
                    'action' => $canonicalAction,
                    'disposition' => $action,
                    'remarks' => $request->remarks,
                    'actor_id' => $request->user()->id,
                    'step_number' => $document->routingHistory()->max('step_number') + 1,
                    'timestamp' => now(),
                ]);

                // Notify originator
                if ($document->originator_id && $document->originator_id !== $request->user()->id) {
                    $notification = \App\Models\Notification::create([
                        'user_id' => $document->originator_id,
                        'type' => 'document_approved',
                        'title' => 'Document Approved',
                        'message' => "Your document \"{$document->subject}\" ({$document->tracking_number}) has been approved. You may track its progress.",
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

                // Notify CC users
                if ($document->cc_list) {
                    $ccUserIds = [];
                    foreach ($document->cc_list as $entry) {
                        if (($entry['type'] ?? '') === 'personnel') {
                            $ccUserIds[] = $entry['id'];
                        } else {
                            $office = \App\Models\Office::find($entry['id'] ?? null);
                            if ($office && $office->head_user_id) $ccUserIds[] = $office->head_user_id;
                        }
                    }
                    foreach ($ccUserIds as $ccUserId) {
                        if ($ccUserId !== $request->user()->id) {
                            $ccNotification = \App\Models\Notification::create([
                                'user_id' => $ccUserId,
                                'type' => 'document_approved',
                                'title' => 'Document Approved',
                                'message' => "The document \"{$document->subject}\" ({$document->tracking_number}) has been approved.",
                                'channel' => 'in_app',
                                'sent_at' => now(),
                                'data' => ['document_id' => $document->id, 'tracking_number' => $document->tracking_number, 'subject' => $document->subject],
                            ]);

                            NotificationCreated::dispatch(
                                $ccNotification->id,
                                $ccNotification->user_id,
                                $ccNotification->type,
                                $ccNotification->title,
                                $ccNotification->message,
                                $ccNotification->data,
                            );
                        }
                    }
                }

            } elseif ($transition === 'reject') {
                $document->update(['status' => DocumentStatus::REJECTED]);

                RoutingHistory::create([
                    'document_id' => $document->id,
                    'from_office_id' => $document->current_office_id,
                    'to_office_id' => $document->current_office_id,
                    'action' => $canonicalAction,
                    'disposition' => $action,
                    'remarks' => $request->remarks,
                    'actor_id' => $request->user()->id,
                    'step_number' => $document->routingHistory()->max('step_number') + 1,
                    'timestamp' => now(),
                ]);

            } elseif ($transition === 'return') {
                $document->update([
                    'status' => DocumentStatus::RETURNED,
                    'current_office_id' => $request->to_office_id,
                ]);

                RoutingHistory::create([
                    'document_id' => $document->id,
                    'from_office_id' => $document->current_office_id,
                    'to_office_id' => $request->to_office_id,
                    'action' => $canonicalAction,
                    'disposition' => $action,
                    'remarks' => $request->remarks,
                    'actor_id' => $request->user()->id,
                    'step_number' => $document->routingHistory()->max('step_number') + 1,
                    'timestamp' => now(),
                ]);

                $returnOffice = \App\Models\Office::find($request->to_office_id);
                if ($returnOffice && $returnOffice->head_user_id && $returnOffice->head_user_id !== $request->user()->id) {
                    $notification = \App\Models\Notification::create([
                        'user_id' => $returnOffice->head_user_id,
                        'type' => 'document_returned',
                        'title' => 'Document Returned',
                        'message' => "The document \"{$document->subject}\" ({$document->tracking_number}) was returned to your office ({$returnOffice->name}) with remarks. Please review and resubmit if needed.",
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
            } elseif ($transition === 'resubmit') {
                $document->update([
'status' => DocumentStatus::RECEIVED,
                    'current_office_id' => $request->to_office_id,
                ]);

                RoutingHistory::create([
                    'document_id' => $document->id,
                    'from_office_id' => $document->current_office_id,
                    'to_office_id' => $request->to_office_id,
                    'action' => $canonicalAction,
                    'disposition' => $action,
                    'remarks' => $request->remarks,
                    'actor_id' => $request->user()->id,
                    'step_number' => $document->routingHistory()->max('step_number') + 1,
                    'timestamp' => now(),
                ]);

                $resubmitOffice = \App\Models\Office::find($request->to_office_id);
                if ($resubmitOffice && $resubmitOffice->head_user_id && $resubmitOffice->head_user_id !== $request->user()->id) {
                    $notification = \App\Models\Notification::create([
                        'user_id' => $resubmitOffice->head_user_id,
                        'type' => 'document_resubmitted',
                        'title' => 'Document Resubmitted',
                        'message' => "The returned document \"{$document->subject}\" ({$document->tracking_number}) was resubmitted to your office. Please review the revisions.",
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
            } elseif ($transition === 'send') {
                if ($document->status !== DocumentStatus::CREATED) {
                    DB::rollBack();
                    return response()->json(['message' => 'Only created documents can be sent'], 422);
                }

                // Resolve recipient: request overrides the stored draft values
                $recipientType = $request->input('recipient_type', $document->recipient_type);
                $recipientId = $request->input('recipient_id', $document->recipient_id);

                if (!$recipientType || !$recipientId) {
                    DB::rollBack();
                    return response()->json(['message' => 'Please select a recipient to send the document to'], 422);
                }

                $targetOfficeId = null;
                if ($recipientType === 'personnel') {
                    $targetUser = \App\Models\User::find($recipientId);
                    if (!$targetUser) {
                        DB::rollBack();
                        return response()->json(['message' => 'Recipient not found'], 422);
                    }
                    $targetOfficeId = $targetUser->office_id;
                } else {
                    $targetOfficeId = $recipientId;
                }

                $fromOfficeId = $document->current_office_id;

                // Personnel without an assigned office still receives the document;
                // it simply stays at its current office for tracking.
                $targetOfficeId = $targetOfficeId ?? $fromOfficeId;

                $document->update([
                    'status' => DocumentStatus::RECEIVED,
                    'current_office_id' => $targetOfficeId,
                    'recipient_type' => $recipientType,
                    'recipient_id' => $recipientId,
                ]);

                RoutingHistory::create([
                    'document_id' => $document->id,
                    'from_office_id' => $fromOfficeId,
                    'to_office_id' => $targetOfficeId,
                    'action' => $canonicalAction,
                    'disposition' => $action,
                    'remarks' => $request->remarks,
                    'actor_id' => $request->user()->id,
                    'step_number' => $document->routingHistory()->max('step_number') + 1,
                    'timestamp' => now(),
                ]);

                // Notify the recipient
                $recipientUserId = null;
                if ($recipientType === 'personnel') {
                    $recipientUserId = $recipientId;
                } elseif ($recipientType === 'office') {
                    $office = \App\Models\Office::find($recipientId);
                    $recipientUserId = $office?->head_user_id;
                }
                if ($recipientUserId && $recipientUserId !== $request->user()->id) {
                    $notification = \App\Models\Notification::create([
                        'user_id' => $recipientUserId,
                        'type' => 'document_created',
                        'title' => 'New Document Received',
                        'message' => "A new document \"{$document->subject}\" ({$document->tracking_number}) was routed to you. Please open it to view details and take action.",
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
            } elseif ($transition === 'file') {
                 $document->update(['status' => DocumentStatus::FILED]);
                 RoutingHistory::create([
                     'document_id' => $document->id,
                     'from_office_id' => $document->current_office_id,
                     'to_office_id' => $document->current_office_id,
                     'action' => $canonicalAction,
                     'disposition' => $action,
                     'remarks' => $request->remarks,
                     'actor_id' => $request->user()->id,
                     'step_number' => $document->routingHistory()->max('step_number') + 1,
                     'timestamp' => now(),
                 ]);
             }
 
             $newStatus = $document->status;

            AuditTrail::create([
                'document_id' => $document->id,
                'user_id' => $request->user()->id,
                'action' => $action,
                'description' => 'Document ' . $action,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'old_values' => ['status' => is_object($oldStatus) ? $oldStatus->value : $oldStatus],
                'new_values' => ['status' => is_object($newStatus) ? $newStatus->value : $newStatus],
            ]);

            DB::commit();

            DocumentStatusChanged::dispatch(
                $document->id,
                $document->tracking_number,
                $document->subject,
                $document->status->value,
                $canonicalAction,
                $request->user()->id,
                $request->user()->name,
            );

            if ($document->originator_id && $document->originator_id !== $request->user()->id) {
                try {
                    $originator = $document->originator;
                    if ($originator && $originator->email) {
                        Mail::to($originator->email)->send(
                            new DocumentNotification($document, $action, $request->remarks)
                        );
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to send email notification: ' . $e->getMessage());
                }
            }

            return response()->json([
                'message' => 'Document ' . $action . ' successfully',
                'document' => $document->refresh()->load(['currentOffice', 'routingTemplate']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function storeComment(Request $request, Document $document)
    {
        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $comment = $document->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $request->body,
        ]);

        $comment->load('user');

        AuditTrail::create([
            'document_id' => $document->id,
            'user_id' => $request->user()->id,
            'action' => 'commented',
            'description' => 'Added a comment',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Comment added',
            'comment' => $comment,
        ], 201);
    }

    public function trackByNumber(Request $request, string $trackingNumber)
    {
        $document = Document::where('tracking_number', $trackingNumber)
            ->with(['currentOffice', 'routingHistory.actor', 'routingHistory.fromOffice', 'routingHistory.toOffice'])
            ->firstOrFail();

        return response()->json([
            'tracking_number' => $document->tracking_number,
            'subject' => $document->subject,
            'status' => $document->status,
            'current_location' => $document->currentOffice->name,
            'last_updated' => $document->updated_at,
            'history' => $document->routingHistory->sortByDesc('timestamp'),
        ]);
    }

    public function uploadAttachment(Request $request, Document $document)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file = $request->file('file');

        $result = $this->storeVersionedAttachment($document, $file, $request->user()->id);

        if ($result['duplicate']) {
            return response()->json([
                'message' => 'An identical file is already attached (version ' . $result['duplicate']->version . '). Upload skipped.',
                'duplicate' => true,
                'attachment' => $result['duplicate'],
            ], 200);
        }

        $attachment = $result['attachment'];

        AuditTrail::create([
            'document_id' => $document->id,
            'user_id' => $request->user()->id,
            'action' => 'attachment_uploaded',
            'description' => 'Attachment uploaded: ' . $attachment->file_name . ' (v' . $attachment->version . ')',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => $attachment->version > 1
                ? 'New version (v' . $attachment->version . ') uploaded successfully'
                : 'Attachment uploaded successfully',
            'attachment' => $attachment,
        ], 201);
    }

    public function attachmentVersions(Document $document, \App\Models\DocumentAttachment $attachment)
    {
        if ($attachment->document_id !== $document->id) {
            return response()->json(['message' => 'Attachment does not belong to this document'], 404);
        }

        $versions = $document->attachments()
            ->where('file_name', $attachment->file_name)
            ->orderByDesc('version')
            ->with('uploader')
            ->get();

        return response()->json($versions);
    }

    public function destroy(Document $document)
    {
        $user = \Illuminate\Support\Facades\Auth::user();

        if (!$user->isAdmin() && $document->originator_id !== $user->id) {
            return response()->json(['message' => 'You are not authorized to delete this document'], 403);
        }

        if (in_array($document->status->value, ['approved', 'released'])) {
            return response()->json(['message' => 'Cannot delete an approved or released document'], 422);
        }

        AuditTrail::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'action' => 'deleted',
            'description' => 'Document deleted',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    public function recall(Request $request, Document $document)
    {
        if ($document->status->value !== 'released') {
            return response()->json(['message' => 'Only released documents can be recalled'], 422);
        }

        DB::beginTransaction();

        try {
            $oldStatus = $document->status;

            $recallOfficeId = $request->user()->office_id ?? $document->current_office_id;

            $document->update([
                'status' => DocumentStatus::RETURNED,
                'current_office_id' => $recallOfficeId,
            ]);

            RoutingHistory::create([
                'document_id' => $document->id,
                'from_office_id' => $document->current_office_id,
                'to_office_id' => $recallOfficeId,
                'action' => 'recalled',
                'remarks' => $request->get('remarks', 'Document recalled from recipient'),
                'actor_id' => $request->user()->id,
                'step_number' => $document->routingHistory()->max('step_number') + 1,
                'timestamp' => now(),
            ]);

            AuditTrail::create([
                'document_id' => $document->id,
                'user_id' => $request->user()->id,
                'action' => 'recalled',
                'description' => 'Document recalled',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'old_values' => ['status' => $oldStatus->value],
                'new_values' => ['status' => DocumentStatus::RETURNED->value],
            ]);

            if ($request->hasFile('attachment')) {
                $this->storeVersionedAttachment($document, $request->file('attachment'), $request->user()->id);
                // The history record was already created above for this step.
                // We'll update the history record with the attachment info if needed, or rely on AuditTrail.
            }

            DB::commit();

            DocumentStatusChanged::dispatch(
                $document->id,
                $document->tracking_number,
                $document->subject,
                $document->status->value,
                'recalled',
                $request->user()->id,
                $request->user()->name,
            );

            return response()->json([
                'message' => 'Document recalled successfully',
                'document' => $document->refresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function downloadAttachment(Document $document, \App\Models\DocumentAttachment $attachment)
    {
        if ($attachment->document_id !== $document->id) {
            return response()->json(['message' => 'Attachment not found'], 404);
        }

        $path = storage_path('app/public/' . $attachment->file_path);

        if (!file_exists($path)) {
            return response()->json(['message' => 'File not found on disk'], 404);
        }

        return response()->download($path, $attachment->file_name);
    }

    public function qrCode(Document $document)
    {
        $trackingUrl = config('app.url') . "/track?track={$document->tracking_number}";
        $qr = \SimpleSoftwareIO\QrCode\Facades\QrCode::size(300)->generate($trackingUrl);

        return response($qr)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Content-Disposition', 'inline; filename="qr-{$document->tracking_number}.svg"');
    }

    /**
     * Store an uploaded file as a versioned attachment.
     *
     * - Identical content (same hash) already attached -> skipped, returns ['duplicate' => existing].
     * - Same file name -> stored as a new version (v+1), older versions marked is_latest=false.
     * - New file name -> version 1.
     *
     * @return array{attachment: ?DocumentAttachment, duplicate: ?DocumentAttachment, version: int}
     */
    private function storeVersionedAttachment(Document $document, $file, int $userId): array
    {
        $hash = hash_file('sha256', $file->getRealPath());

        // Exact same content already on this document -> treat as duplicate, skip.
        $existingByHash = $document->attachments()->where('file_hash', $hash)->first();
        if ($existingByHash) {
            return ['attachment' => null, 'duplicate' => $existingByHash, 'version' => $existingByHash->version];
        }

        $originalName = $file->getClientOriginalName();

        // Same name -> new version of that logical file.
        $currentLatest = $document->attachments()
            ->where('file_name', $originalName)
            ->orderByDesc('version')
            ->first();

        $version = $currentLatest ? $currentLatest->version + 1 : 1;

        if ($currentLatest) {
            $document->attachments()
                ->where('file_name', $originalName)
                ->update(['is_latest' => false]);
        }

        // Compress supported images (re-encode to JPEG, strips EXIF).
        $compressed = ImageProcessor::compressImage($file->getRealPath());
        $isCompressed = $compressed !== null && $compressed['size'] < $file->getSize();

        if ($isCompressed) {
            $path = 'documents/' . $document->id . '/' . Str::random(40) . '.jpg';
            $fileType = $compressed['mime'];
            $fileSize = $compressed['size'];
        } else {
            $path = $file->store('documents/' . $document->id, 'public');
            $fileType = $file->getMimeType();
            $fileSize = $file->getSize();
        }

        $this->enforceOfficeQuota($document, $fileSize);

        if ($isCompressed) {
            Storage::disk('public')->put($path, $compressed['content']);
        }

        $attachment = $document->attachments()->create([
            'file_name' => $originalName,
            'file_path' => $path,
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'file_hash' => $hash,
            'version' => $version,
            'is_latest' => true,
            'is_compressed' => $isCompressed,
            'uploaded_by' => $userId,
        ]);

        return ['attachment' => $attachment, 'duplicate' => null, 'version' => $version];
    }

    /**
     * Block the upload when the document's originating office is over its storage quota.
     */
    private function enforceOfficeQuota(Document $document, int $incomingBytes): void
    {
        $officeId = $document->originator?->office_id;
        if (!$officeId) {
            return;
        }

        $office = Office::find($officeId);
        if (!$office || !$office->storage_quota_bytes) {
            return;
        }

        $used = DocumentAttachment::query()
            ->join('documents', 'documents.id', '=', 'document_attachments.document_id')
            ->join('users', 'users.id', '=', 'documents.originator_id')
            ->where('users.office_id', $officeId)
            ->whereNull('document_attachments.archived_at')
            ->sum('document_attachments.file_size');

        if (($used + $incomingBytes) > $office->storage_quota_bytes) {
            throw ValidationException::withMessages([
                'file' => "Storage quota exceeded for {$office->name}. Free up space or increase the office quota.",
            ]);
        }
    }

    /**
     * Disseminate a document to all users (post for all-to-see).
     * Sets is_public = true, status = released, and broadcasts in-app notifications.
     */
    public function disseminate(Request $request, Document $document)
    {
        $request->validate([
            'remarks' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        DB::beginTransaction();
        try {
            $document->update([
                'is_public'  => true,
                'status'     => DocumentStatus::RELEASED,
                'released_at' => now(),
            ]);

            // Record routing history
            RoutingHistory::create([
                'document_id'   => $document->id,
                'from_office_id' => $document->current_office_id,
                'to_office_id'  => $document->current_office_id,
                'action'        => 'approved',
                'disposition'   => 'disseminated',
                'remarks'       => $request->remarks ?: 'Posted for all-staff viewing.',
                'actor_id'      => $user->id,
                'step_number'   => $document->routingHistory()->max('step_number') + 1,
                'timestamp'     => now(),
            ]);

            // Audit trail
            AuditTrail::create([
                'document_id' => $document->id,
                'user_id'     => $user->id,
                'action'      => 'disseminated',
                'description' => 'Document disseminated to all staff.',
                'ip_address'  => $request->ip(),
                'user_agent'  => $request->userAgent(),
            ]);

            // Notify all active users (except the actor)
            $allUsers = \App\Models\User::where('status', 'active')
                ->where('id', '!=', $user->id)
                ->get(['id', 'name']);

            foreach ($allUsers as $recipient) {
                $notification = \App\Models\Notification::create([
                    'user_id'    => $recipient->id,
                    'type'       => 'document_disseminated',
                    'title'      => 'New Announcement Posted',
                    'message'    => "\"{$document->subject}\" ({$document->tracking_number}) has been posted for all staff. Please read and acknowledge.",
                    'channel'    => 'in_app',
                    'sent_at'    => now(),
                    'data'       => ['document_id' => $document->id, 'tracking_number' => $document->tracking_number, 'subject' => $document->subject],
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

            DB::commit();

            DocumentStatusChanged::dispatch(
                $document->id,
                $document->tracking_number,
                $document->subject,
                $document->status->value,
                'disseminated',
                $user->id,
                $user->name,
            );

            return response()->json([
                'message'  => 'Document disseminated to all staff.',
                'document' => $document->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Dissemination failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Post a new announcement directly.
     * Creates a document already marked as public/released.
     */
    public function storeAnnouncement(Request $request)
    {
        $request->validate([
            'subject'       => 'required|string|max:255',
            'description'   => 'nullable|string',
            'document_type' => 'required|string|max:100|in:' . implode(',', array_keys(\App\Models\Document::DOCUMENT_TYPES)),
            'attachments'   => 'nullable|array',
            'attachments.*' => 'file|max:10240',
        ]);

        $user = $request->user();

        DB::beginTransaction();
        try {
            $defaultOfficeId = $user->office_id ?? \App\Models\Office::query()->value('id');

            $document = Document::create([
                'tracking_number'     => Document::generateTrackingNumber($user->office?->code),
                'document_type'       => $request->document_type,
                'subject'             => $request->subject,
                'description'         => $request->description,
                'priority'            => 'normal',
                'classification'      => 'public',
                'mode_of_transmittal' => 'internal',
                'status'              => DocumentStatus::RELEASED,
                'released_at'         => now(),
                'is_public'           => true,
                'originator_id'       => $user->id,
                'current_office_id'   => $defaultOfficeId,
                'recipient_type'      => 'office',
                'recipient_id'        => $defaultOfficeId,
                'cc_list'             => [],
                'bcc_list'            => [],
                'sla_deadline'        => now()->addHours(\App\Models\SystemSetting::getDefaultSlaHours()),
            ]);

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $this->storeVersionedAttachment($document, $file, $user->id);
                }
            }

            RoutingHistory::create([
                'document_id'    => $document->id,
                'from_office_id' => $document->current_office_id,
                'to_office_id'   => $document->current_office_id,
                'action'         => 'approved',
                'disposition'    => 'disseminated',
                'remarks'        => 'Announcement posted directly.',
                'actor_id'       => $user->id,
                'step_number'    => 1,
                'timestamp'      => now(),
            ]);

            AuditTrail::create([
                'document_id' => $document->id,
                'user_id'     => $user->id,
                'action'      => 'created',
                'description' => 'Announcement posted',
                'ip_address'  => $request->ip(),
                'user_agent'  => $request->userAgent(),
            ]);

            // Notify all active users (except the actor)
            $allUsers = \App\Models\User::where('status', 'active')
                ->where('id', '!=', $user->id)
                ->get(['id', 'name']);

            foreach ($allUsers as $recipient) {
                $notification = \App\Models\Notification::create([
                    'user_id'    => $recipient->id,
                    'type'       => 'document_disseminated',
                    'title'      => 'New Announcement Posted',
                    'message'    => "\"{$document->subject}\" ({$document->tracking_number}) has been posted for all staff.",
                    'channel'    => 'in_app',
                    'sent_at'    => now(),
                    'data'       => ['document_id' => $document->id, 'tracking_number' => $document->tracking_number, 'subject' => $document->subject],
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

            DB::commit();

            DocumentStatusChanged::dispatch(
                $document->id,
                $document->tracking_number,
                $document->subject,
                $document->status->value,
                'announced',
                $user->id,
                $user->name,
            );

            return response()->json([
                'message'  => 'Announcement posted successfully.',
                'document' => $document,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to post announcement: ' . $e->getMessage()], 500);
        }
    }
}


