<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth'])->name('dashboard');

Route::get('/admin', function () {
    return view('admin');
})->middleware(['auth', 'admin'])->name('admin');

Route::get('/setup-admin', function () {
    \App\Models\User::updateOrCreate(
        ['email' => 'admin@tarim.com'],
        [
            'name' => 'Admin',
            'password' => bcrypt('1234'),
            'role' => 'admin',
        ]
    );

    return 'Admin oluşturuldu!';
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
