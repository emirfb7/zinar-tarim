<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creditor_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('creditor_id');
            $table->date('date');
            $table->string('product');
            $table->decimal('qty', 10, 2);
            $table->string('unit');
            $table->decimal('price', 10, 2);
            $table->decimal('total', 10, 2);
            $table->string('source')->nullable();
            $table->boolean('stoga_eklendi')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creditor_transactions');
    }
};
