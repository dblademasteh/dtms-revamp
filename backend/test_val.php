<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$req = \Illuminate\Http\Request::create("/api", "POST", ["action" => "resubmit", "to_office_id" => null]);
try {
    validator($req->all(), ["to_office_id" => "required_if:action,resubmit|exists:offices,id"])->validate();
    echo "Validation passed\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    print_r($e->errors());
} catch (\Exception $e) {
    echo get_class($e) . ": " . $e->getMessage() . "\n";
}
