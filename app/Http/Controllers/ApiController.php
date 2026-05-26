<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiController extends Controller
{
    public function query(Request $request): JsonResponse
    {
        try {
            $input = json_decode($request->getContent(), true) ?? [];
            $table = $input['table'] ?? '';
            $action = $input['action'] ?? 'select';
            $filters = $input['filters'] ?? [];
            $orders = $input['orders'] ?? [];
            $limit = $input['limit'] ?? null;
            $body = $input['body'] ?? null;
            $inList = $input['inList'] ?? null;

            $allowed = [
                'products',
                'sales',
                'debtors',
                'debtor_transactions',
                'debt_payments',
                'creditors',
                'creditor_transactions',
                'creditor_payments',
                'eski_alacaklar',
            ];

            if (! in_array($table, $allowed, true)) {
                return response()->json([
                    'data' => null,
                    'error' => ['message' => 'Gecersiz tablo'],
                ], 400);
            }

            if ($action === 'select') {
                $query = DB::table($table);
                $this->applyFilters($query, $filters);
                $this->applyInList($query, $inList);

                foreach ($orders as $order) {
                    $column = $order['column'] ?? $order['col'] ?? null;
                    $ascending = $order['ascending'] ?? $order['asc'] ?? true;

                    if ($column) {
                        $query->orderBy($column, $ascending ? 'asc' : 'desc');
                    }
                }

                if ($limit !== null) {
                    $query->take((int) $limit);
                }

                return response()->json([
                    'data' => $query->get()->map(fn ($row) => (array) $row)->all(),
                    'error' => null,
                ]);
            }

            if ($action === 'insert') {
                if (is_string($body)) {
                    $body = json_decode($body, true);
                }

                if (! is_array($body)) {
                    return response()->json([
                        'data' => null,
                        'error' => ['message' => 'Geçersiz body'],
                    ], 400);
                }

                $isMultiple = isset($body[0]) && is_array($body[0]);

                if ($isMultiple) {
                    $inserted = [];

                    foreach ($body as $item) {
                        $item['id'] = Str::uuid()->toString();
                        $inserted[] = $item;
                    }

                    DB::table($table)->insert($inserted);

                    return response()->json(['data' => $inserted, 'error' => null]);
                }

                $body['id'] = Str::uuid()->toString();
                DB::table($table)->insert($body);

                return response()->json(['data' => $body, 'error' => null]);
            }
            if ($action === 'update') {
                $query = DB::table($table);
                $this->applyFilters($query, $filters);
                $query->update($body ?? []);

                return response()->json(['data' => $body, 'error' => null]);
            }

            if ($action === 'delete') {
                $query = DB::table($table);
                $this->applyFilters($query, $filters);
                $this->applyInList($query, $inList);
                $query->delete();

                return response()->json(['data' => null, 'error' => null]);
            }

            return response()->json([
                'data' => null,
                'error' => ['message' => 'Bilinmeyen action: '.$action],
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'data' => null,
                'error' => ['message' => $e->getMessage()],
            ], 500);
        }
    }

    public function auth(Request $request): JsonResponse
    {
        try {
            $action = $request->input('action', '');

            if (in_array($action, ['login', 'signInWithPassword'], true)) {
                $email = $request->input('email', '');
                $password = $request->input('password', '');
                $user = User::where('email', $email)->first();

                if ($user && Hash::check($password, $user->password)) {
                    return response()->json([
                        'data' => ['session' => $user, 'user' => $user],
                        'session' => $user,
                        'user' => $user,
                        'error' => null,
                    ]);
                }

                return response()->json([
                    'data' => null,
                    'error' => ['message' => 'GeÃ§ersiz e-posta veya ÅŸifre'],
                ], 401);
            }

            if (in_array($action, ['logout', 'signOut'], true)) {
                return response()->json(['data' => null, 'error' => null]);
            }

            if (in_array($action, ['session', 'getSession'], true)) {
                return response()->json([
                    'data' => ['session' => $request->user()],
                    'session' => $request->user(),
                    'error' => null,
                ]);
            }

            return response()->json([
                'data' => null,
                'error' => ['message' => 'Bilinmeyen action'],
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'data' => null,
                'error' => ['message' => $e->getMessage()],
            ], 500);
        }
    }

    private function applyFilters($query, array $filters): void
    {
        foreach ($filters as $filter) {
            $type = $filter['type'] ?? $filter['op'] ?? 'eq';
            $column = $filter['column'] ?? $filter['col'] ?? null;
            $value = $filter['value'] ?? $filter['val'] ?? null;

            if (! $column) {
                continue;
            }

            match ($type) {
                'eq' => $query->where($column, $value),
                'gte' => $query->where($column, '>=', $value),
                'lte' => $query->where($column, '<=', $value),
                'gt' => $query->where($column, '>', $value),
                'lt' => $query->where($column, '<', $value),
                'neq' => $query->where($column, '!=', $value),
                'ilike' => $query->where($column, 'like', '%'.str_replace('%', '', (string) $value).'%'),
                default => null,
            };
        }
    }

    private function applyInList($query, mixed $inList): void
    {
        if (! $inList) {
            return;
        }

        foreach ((array) $inList as $item) {
            $column = $item['column'] ?? $item['col'] ?? null;
            $values = $item['values'] ?? $item['vals'] ?? [];

            if ($column) {
                $query->whereIn($column, $values);
            }
        }
    }
}

