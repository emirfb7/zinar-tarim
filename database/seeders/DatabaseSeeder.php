<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::table('products')->insert([
            ['id' => Str::uuid(), 'name' => 'Üre Gübre', 'cat' => 'Gübre', 'sub' => 'Katı Gübre', 'stock' => 150, 'unit' => 'kg', 'price' => 45.00, 'min_stock' => 20, 'last_in' => '2026-05-01', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'DAP Gübre', 'cat' => 'Gübre', 'sub' => 'Katı Gübre', 'stock' => 200, 'unit' => 'kg', 'price' => 62.00, 'min_stock' => 30, 'last_in' => '2026-05-01', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Potasyum Nitrat', 'cat' => 'Gübre', 'sub' => 'Sıvı Gübre', 'stock' => 80, 'unit' => 'lt', 'price' => 38.50, 'min_stock' => 15, 'last_in' => '2026-04-15', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Roundup Herbisit', 'cat' => 'İlaç', 'sub' => 'Herbisit', 'stock' => 60, 'unit' => 'lt', 'price' => 125.00, 'min_stock' => 10, 'last_in' => '2026-05-10', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Karate İnsektisit', 'cat' => 'İlaç', 'sub' => 'İnsektisit', 'stock' => 45, 'unit' => 'lt', 'price' => 89.00, 'min_stock' => 8, 'last_in' => '2026-05-05', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Score Fungisit', 'cat' => 'İlaç', 'sub' => 'Fungisit', 'stock' => 30, 'unit' => 'lt', 'price' => 145.00, 'min_stock' => 5, 'last_in' => '2026-04-20', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Domates Tohumu', 'cat' => 'Tohum', 'sub' => 'Sebze Tohumu', 'stock' => 500, 'unit' => 'adet', 'price' => 2.50, 'min_stock' => 100, 'last_in' => '2026-03-01', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Buğday Tohumu', 'cat' => 'Tohum', 'sub' => 'Tahıl Tohumu', 'stock' => 1000, 'unit' => 'kg', 'price' => 18.00, 'min_stock' => 200, 'last_in' => '2026-03-15', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Mısır Hibrit Tohum', 'cat' => 'Tohum', 'sub' => 'Hibrit Tohum', 'stock' => 300, 'unit' => 'kg', 'price' => 35.00, 'min_stock' => 50, 'last_in' => '2026-04-01', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'İlaçlama Pompası', 'cat' => 'Ekipman', 'sub' => 'Pompa', 'stock' => 15, 'unit' => 'adet', 'price' => 850.00, 'min_stock' => 3, 'last_in' => '2026-02-10', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Damla Sulama Borusu', 'cat' => 'Ekipman', 'sub' => 'Sulama', 'stock' => 500, 'unit' => 'metre', 'price' => 4.20, 'min_stock' => 100, 'last_in' => '2026-03-20', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Fare Zehiri', 'cat' => 'Zehir', 'sub' => 'Rodentisit', 'stock' => 40, 'unit' => 'kg', 'price' => 55.00, 'min_stock' => 10, 'last_in' => '2026-05-12', 'last_out' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
