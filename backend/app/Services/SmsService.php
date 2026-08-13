<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class SmsService
{
    public function isConfigured(): bool
    {
        return !empty(config('services.semaphore.api_key'));
    }

    public function send(string $phone, string $message): bool
    {
        if (!$this->isConfigured() || !$phone) {
            return false;
        }

        $phone = $this->normalize($phone);

        try {
            $response = Http::timeout(10)
                ->asForm()
                ->post('https://api.semaphore.co/api/v4/messages', [
                    'apikey' => config('services.semaphore.api_key'),
                    'number' => $phone,
                    'message' => $message,
                    'sendername' => config('services.semaphore.sender_name'),
                ]);

            return $response->successful();
        } catch (\Throwable $e) {
            logger()->warning('SMS send failed', ['phone' => $phone, 'error' => $e->getMessage()]);

            return false;
        }
    }

    private function normalize(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (strlen($phone) === 10 && str_starts_with($phone, '9')) {
            $phone = '63' . $phone;
        } elseif (strlen($phone) === 12 && str_starts_with($phone, '63')) {
            // already in international format
        }

        return $phone;
    }
}
