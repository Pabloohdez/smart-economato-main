<?php
require_once 'config.php';

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT * FROM categorias";
    $result = $conn->query($sql);
    
    $categorias = [];
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $categorias[] = $row;
        }
    }
    echo json_encode($categorias);
}

$conn->close();
?>
