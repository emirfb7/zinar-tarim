<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('debtor_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('debtor_id');
            $table->date('date');
            $table->string('product');
            $table->decimal('qty', 10, 2);
            $table->string('unit');
            $table->decimal('price', 10, 2);
            $table->decimal('total', 10, 2);
            $table->boolean('paid')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debtor_transactions');
    }
};
