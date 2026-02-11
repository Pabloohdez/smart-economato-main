<?php
require_once 'config.php';

// Tables to fix
$tables = ['proveedores', 'categorias', 'productos', 'pedidos', 'movimientos'];

echo "<h1>Fixing Database Sequences</h1>";

foreach ($tables as $table) {
    // 1. Get the correct sequence name associated with the 'id' column
    $querySeq = "SELECT pg_get_serial_sequence('$table', 'id')";
    $resSeq = pg_query($conn, $querySeq);
    
    if (!$resSeq) {
        echo "<p style='color:red'>Failed to get sequence for table <strong>$table</strong>: " . pg_last_error($conn) . "</p>";
        continue;
    }
    
    $seqName = pg_fetch_result($resSeq, 0, 0);
    
    if (!$seqName) {
        echo "<p style='color:orange'>No sequence found for table <strong>$table</strong> (maybe not using SERIAL/IDENTITY id?)</p>";
        continue;
    }
    
    // 2. Get the maximum ID currently in the table
    $queryMax = "SELECT COALESCE(MAX(id), 0) FROM $table";
    $resMax = pg_query($conn, $queryMax);
    $maxId = pg_fetch_result($resMax, 0, 0);
    
    // 3. Reset the sequence to the max ID
    // setval(seq, val) sets the *current* value. The next nextval() will be val+1.
    $queryReset = "SELECT setval('$seqName', $maxId)";
    $resReset = pg_query($conn, $queryReset);
    
    if ($resReset) {
        echo "<p style='color:green'>✅ Sequence <strong>$seqName</strong> reset to <strong>$maxId</strong>.</p>";
    } else {
        echo "<p style='color:red'>❌ Failed to reset sequence for <strong>$table</strong>: " . pg_last_error($conn) . "</p>";
    }
}
?>
