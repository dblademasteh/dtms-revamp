<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('failed_login_attempts')->default(0)->after('status');
            $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            $table->string('email_verify_token')->nullable()->after('email_verified_at');
            $table->timestamp('email_verify_token_sent_at')->nullable()->after('email_verify_token');
        });

        Schema::create('login_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email')->nullable();
            $table->boolean('success')->default(false);
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['success', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_audits');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['failed_login_attempts', 'locked_until', 'email_verify_token', 'email_verify_token_sent_at']);
        });
    }
};
