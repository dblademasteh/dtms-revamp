<x-mail::message>
# Reset Your Password

You are receiving this email because we received a password reset request for your account.

<x-mail::panel>
**Account:** {{ $user->email }}<br>
**Name:** {{ $user->name }}
</x-mail::panel>

This link will expire in 60 minutes. Click the button below to set a new password:

<x-mail::button :url="$resetUrl">
Reset Password
</x-mail::button>

If you did not request a password reset, no further action is required.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
