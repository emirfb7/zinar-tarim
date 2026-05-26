<?php

use App\Http\Controllers\ApiController;
use Illuminate\Support\Facades\Route;

// Route::middleware('auth:sanctum')->post('/query', [ApiController::class, 'query']);

Route::post('/query', [ApiController::class, 'query']);
Route::post('/auth', [ApiController::class, 'auth']);
