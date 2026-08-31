<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(BfpRegion2Seeder::class);
        $this->call(DropdownOptionSeeder::class);
    }
}
