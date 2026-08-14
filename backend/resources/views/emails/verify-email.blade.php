<x-mail::message>
# Verify Your Email

Hi {{ $user->name }},

Please confirm this email address belongs to your account so you can receive password resets and document notifications.

<x-mail::button :url="$verifyUrl">
Verify Email Address
</x-mail::button>

This link will expire in 24 hours. If you did not request this, you can safely ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
