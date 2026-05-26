<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('product_id');
            $table->string('product_name');
            $table->decimal('qty', 10, 2);
            $table->string('unit');
            $table->decimal('price', 10, 2);
            $table->decimal('total', 10, 2);
            $table->date('sale_date');
            $table->string('sale_time');
            $table->string('cat');
            $table->string('odeme_turu');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
