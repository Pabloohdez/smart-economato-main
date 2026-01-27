<?php
require_once 'config.php';

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT * FROM proveedores";
    $result = $conn->query($sql);
    
    $proveedores = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $proveedores[] = $row;
        }
    }
    echo json_encode($proveedores);
}

$conn->close();
?>
