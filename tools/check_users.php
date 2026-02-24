<?php
require_once 'api/config.php';
$res = pg_query($conn, "SELECT id, username FROM usuarios");
echo "USERS IN DB:\n";
while($row = pg_fetch_assoc($res)) {
    print_r($row);
}
?>
