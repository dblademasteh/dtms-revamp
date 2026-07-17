<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$ref = new ReflectionMethod('App\Http\Controllers\Api\DocumentController', 'downloadAttachment');
foreach($ref->getParameters() as $p) {
    echo $p->getName() . ': ' . ($p->getType() ? $p->getType()->getName() : 'none') . "\n";
}
