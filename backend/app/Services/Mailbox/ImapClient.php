<?php

namespace App\Services\Mailbox;

use RuntimeException;

class ImapClient
{
    protected $socket;
    protected string $host;
    protected int $port;
    protected string $encryption;
    protected string $username;
    protected string $password;
    protected int $timeout;
    protected int $tag = 0;
    protected string $selected = '';

    public function __construct(array $config)
    {
        $this->host = $config['host'];
        $this->port = (int) ($config['port'] ?? 993);
        $this->encryption = $config['encryption'] ?? 'ssl';
        $this->username = $config['username'];
        $this->password = $config['password'];
        $this->timeout = (int) ($config['timeout'] ?? 30);
    }

    public function connect(): self
    {
        $transport = $this->encryption === 'ssl' ? 'ssl' : 'tcp';
        $remote = $transport . '://' . $this->host . ':' . $this->port;
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ]);

        $errno = 0;
        $errstr = '';
        $this->socket = @stream_socket_client($remote, $errno, $errstr, $this->timeout, STREAM_CLIENT_CONNECT, $context);
        if (!$this->socket) {
            throw new RuntimeException("Could not connect to IMAP server {$this->host}:{$this->port} ({$errstr})");
        }
        stream_set_timeout($this->socket, $this->timeout);

        // Read greeting
        $this->readResponse('*');

        if ($this->encryption === 'starttls') {
            $resp = $this->execute('STARTTLS');
            if ($resp['status'] !== 'OK') {
                throw new RuntimeException('IMAP STARTTLS was rejected by the server');
            }
            if (!stream_socket_enable_crypto($this->socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('IMAP STARTTLS negotiation failed');
            }
        }

        $this->login();

        return $this;
    }

    public function logout(): void
    {
        try {
            if (is_resource($this->socket)) {
                $this->execute('LOGOUT');
            }
        } catch (\Throwable $e) {
            // ignore
        } finally {
            if (is_resource($this->socket)) {
                fclose($this->socket);
            }
        }
    }

    public function __destruct()
    {
        if (is_resource($this->socket)) {
            @fclose($this->socket);
        }
    }

    public function listFolders(): array
    {
        $resp = $this->execute('LIST "" "*"');
        $folders = [];
        foreach ($resp['untagged'] as $item) {
            if (!preg_match('/^\* LIST \(([^)]*)\)\s+"[^"]*"\s+(.*)$/', $item['line'], $m)) {
                continue;
            }
            $attributes = $m[1];
            $rest = trim($m[2]);
            // The folder name may be quoted or a literal
            $name = null;
            if (preg_match('/^"((?:\\\\.|[^"])*)"$/', $rest, $nm)) {
                $name = stripcslashes($nm[1]);
            } elseif ($item['literal'] !== null) {
                $name = $item['literal'];
            } elseif ($rest !== '') {
                $name = $rest;
            }
            if ($name === null) {
                continue;
            }
            $folders[] = [
                'name' => $name,
                'sent' => str_contains(strtolower($name), 'sent'),
                'trash' => str_contains(strtolower($name), 'trash') || str_contains(strtolower($name), 'deleted'),
                'drafts' => str_contains(strtolower($name), 'draft'),
            ];
        }
        return $folders;
    }

    public function select(string $folder): array
    {
        $resp = $this->execute('SELECT ' . $this->quote($folder));
        if ($resp['status'] !== 'OK') {
            throw new RuntimeException("Could not select folder \"{$folder}\": {$resp['line']}");
        }
        $this->selected = $folder;
        $info = ['uidvalidity' => null, 'uidnext' => null, 'exists' => null];
        foreach ($resp['untagged'] as $item) {
            if (preg_match('/UIDVALIDITY (\d+)/i', $item['line'], $m)) {
                $info['uidvalidity'] = (int) $m[1];
            }
            if (preg_match('/UIDNEXT (\d+)/i', $item['line'], $m)) {
                $info['uidnext'] = (int) $m[1];
            }
            if (preg_match('/^\\* (\d+) EXISTS/i', $item['line'], $m)) {
                $info['exists'] = (int) $m[1];
            }
        }
        return $info;
    }

    public function allUids(string $folder): array
    {
        $this->ensureSelected($folder);
        $resp = $this->execute('UID SEARCH ALL');
        $uids = [];
        foreach ($resp['untagged'] as $item) {
            if (preg_match('/^\\* SEARCH(.*)$/i', $item['line'], $m)) {
                foreach (preg_split('/\s+/', trim($m[1])) as $u) {
                    if (ctype_digit($u)) {
                        $uids[] = (int) $u;
                    }
                }
            }
        }
        sort($uids, SORT_NUMERIC);
        return $uids;
    }

    /**
     * Fetch full raw messages (with metadata) for the given UIDs.
     *
     * @return array<int, array{uid:int, flags:array, internaldate:?string, raw:string}>
     */
    public function fetchMessages(string $folder, array $uids): array
    {
        $this->ensureSelected($folder);
        $results = [];
        $chunks = array_chunk($uids, 200);
        foreach ($chunks as $chunk) {
            $resp = $this->execute('UID FETCH ' . implode(',', $chunk) . ' (UID FLAGS INTERNALDATE BODY.PEEK[])');
            foreach ($resp['untagged'] as $item) {
                if ($item['literal'] === null || !preg_match('/^\* \d+ FETCH \(/i', $item['line'])) {
                    continue;
                }
                $uid = null;
                if (preg_match('/UID (\d+)/', $item['line'], $m)) {
                    $uid = (int) $m[1];
                }
                $flags = [];
                if (preg_match('/FLAGS \(([^)]*)\)/', $item['line'], $m)) {
                    $flags = $m[1] ? preg_split('/\s+/', trim($m[1])) : [];
                }
                $internaldate = null;
                if (preg_match('/INTERNALDATE "([^"]+)"/', $item['line'], $m)) {
                    $internaldate = $m[1];
                }
                if ($uid !== null) {
                    $results[] = [
                        'uid' => $uid,
                        'flags' => $flags,
                        'internaldate' => $internaldate,
                        'raw' => $item['literal'],
                    ];
                }
            }
        }
        return $results;
    }

    /**
     * Lightweight flag sync: returns uid => [flags] for the given UIDs.
     */
    public function fetchFlags(string $folder, array $uids): array
    {
        $this->ensureSelected($folder);
        $flagsByUid = [];
        $chunks = array_chunk($uids, 500);
        foreach ($chunks as $chunk) {
            $resp = $this->execute('UID FETCH ' . implode(',', $chunk) . ' (UID FLAGS)');
            foreach ($resp['untagged'] as $item) {
                if (preg_match('/^\* \d+ FETCH \(/i', $item['line'])) {
                    $uid = null;
                    if (preg_match('/UID (\d+)/', $item['line'], $m)) {
                        $uid = (int) $m[1];
                    }
                    $flags = [];
                    if (preg_match('/FLAGS \(([^)]*)\)/', $item['line'], $m)) {
                        $flags = $m[1] ? preg_split('/\s+/', trim($m[1])) : [];
                    }
                    if ($uid !== null) {
                        $flagsByUid[$uid] = $flags;
                    }
                }
            }
        }
        return $flagsByUid;
    }

    public function setFlag(string $folder, int $uid, string $flag, bool $set = true): void
    {
        $this->ensureSelected($folder);
        $this->execute('UID STORE ' . $uid . ' ' . ($set ? '+' : '-') . 'FLAGS (' . $flag . ')');
    }

    public function delete(string $folder, int $uid): void
    {
        $this->setFlag($folder, $uid, '\\Deleted', true);
        $this->execute('EXPUNGE');
    }

    public function move(string $sourceFolder, int $uid, string $destFolder): void
    {
        $this->ensureSelected($sourceFolder);
        $this->execute('UID COPY ' . $uid . ' ' . $this->quote($destFolder));
        $this->execute('UID STORE ' . $uid . ' +FLAGS (\\Deleted)');
        $this->execute('EXPUNGE');
    }

    public function append(string $folder, string $raw): void
    {
        $this->execute('APPEND ' . $this->quote($folder) . ' (\\Seen) {' . strlen($raw) . '}', [$raw]);
    }

    protected function login(): void
    {
        $resp = $this->execute('LOGIN {' . strlen($this->username) . '}', [$this->username, $this->password]);
        if ($resp['status'] !== 'OK') {
            throw new RuntimeException('IMAP login failed: ' . $resp['line']);
        }
    }

    protected function ensureSelected(string $folder): void
    {
        if ($this->selected !== $folder) {
            $this->select($folder);
        }
    }

    protected function execute(string $command, array $literals = []): array
    {
        if (!is_resource($this->socket)) {
            throw new RuntimeException('IMAP connection is not open');
        }
        $tag = 'A' . (++$this->tag);
        fwrite($this->socket, $tag . ' ' . $command . "\r\n");
        return $this->readResponse($tag, $literals);
    }

    protected function readResponse(string $tag, array &$literals = []): array
    {
        $untagged = [];
        while (true) {
            $item = $this->readLine();
            $line = $item['line'];

            if (str_starts_with($line, '+')) {
                if ($literals) {
                    $data = array_shift($literals);
                    if ($literals) {
                        $data .= ' {' . strlen($literals[0]) . '}';
                    }
                    fwrite($this->socket, $data . "\r\n");
                }
                continue;
            }

            if ($item['literal'] !== null) {
                $untagged[] = $item;
                continue;
            }

            if (preg_match('/^\* /', $line)) {
                $untagged[] = ['line' => $line, 'literal' => null];
                continue;
            }

            if ($tag === '*') {
                // greeting / tagged-agnostic read (first line)
                return ['status' => 'OK', 'untagged' => $untagged, 'line' => $line];
            }

            if (preg_match('/^' . preg_quote($tag, '/') . ' (OK|NO|BAD|PREAUTH|BYE)/i', $line, $m)) {
                return ['status' => strtoupper($m[1]), 'untagged' => $untagged, 'line' => $line];
            }
        }
    }

    protected function readLine(): array
    {
        $line = '';
        while (($c = fgetc($this->socket)) !== false) {
            if ($c === "\n") {
                break;
            }
            $line .= $c;
        }
        if ($line === '' && feof($this->socket)) {
            throw new RuntimeException('IMAP connection closed by server');
        }
        $line = rtrim($line, "\r");

        if (preg_match('/\{(\d+)\}$/', $line, $m)) {
            $size = (int) $m[1];
            $literal = $this->readBytes($size);
            $this->readLine(); // consume trailing CRLF
            return ['line' => $line, 'literal' => $literal];
        }

        return ['line' => $line, 'literal' => null];
    }

    protected function readBytes(int $size): string
    {
        $data = '';
        $remaining = $size;
        while ($remaining > 0) {
            $chunk = fread($this->socket, min(16384, $remaining));
            if ($chunk === false || $chunk === '') {
                throw new RuntimeException('IMAP read failed while reading message data');
            }
            $data .= $chunk;
            $remaining -= strlen($chunk);
        }
        return $data;
    }

    protected function quote(string $value): string
    {
        return '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $value) . '"';
    }
}
