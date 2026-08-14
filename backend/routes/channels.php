<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('App.Models.Document.{id}', function (User $user, int $id) {
    $document = \App\Models\Document::find($id);
    if (!$document) {
        return false;
    }

    $roleValue = is_object($user->role) ? $user->role->value : $user->role;

    return $user->isAdmin()
        || !empty($user->can_view_all_documents)
        || in_array($roleValue, ['superadmin', 'fcos'], true)
        || $document->isVisibleTo($user);
});
