<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eski_alacaklar', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ad');
            $table->string('telefon')->nullable();
            $table->decimal('tutar', 10, 2);
            $table->decimal('odenen', 10, 2)->default(0);
            $table->string('aciklama')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eski_alacaklar');
    }
};
