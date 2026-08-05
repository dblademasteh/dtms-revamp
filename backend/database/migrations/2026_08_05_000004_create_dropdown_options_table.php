<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dropdown_options', function (Blueprint $table) {
            $table->id();
            $table->string('group')->index();
            $table->string('value');
            $table->string('label');
            $table->integer('sort_order')->default(0);
            $table->json('meta')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['group', 'value']);
            $table->index(['group', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dropdown_options');
    }
};
