<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creditor_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('creditor_id');
            $table->string('transaction_id');
            $table->decimal('amount', 10, 2);
            $table->date('date');
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creditor_payments');
    }
};
