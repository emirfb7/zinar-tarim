<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('cat');
            $table->string('sub');
            $table->integer('stock')->default(0);
            $table->string('unit');
            $table->decimal('price', 10, 2);
            $table->integer('min_stock')->default(0);
            $table->date('last_in')->nullable();
            $table->date('last_out')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
