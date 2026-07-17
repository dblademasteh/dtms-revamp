<x-mail::message>
# {{ ucfirst($action) }}: {{ $subject }}

A document has been {{ $action }} in the Document Tracking System.

<x-mail::panel>
**Tracking Number:** {{ $trackingNumber }}<br>
**Subject:** {{ $subject }}<br>
**Status:** {{ ucfirst($document->status) }}<br>
**Priority:** {{ ucfirst($document->priority) }}
</x-mail::panel>

@if($message)
**Remarks:** {{ $message }}
@endif

<x-mail::button :url="env('APP_URL') . '/documents/' . $document->id">
View Document
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
