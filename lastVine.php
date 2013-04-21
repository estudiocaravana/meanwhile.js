<?php 

define('VINE_URL', 'http://vinepeek.com/videos');

$ch = curl_init(VINE_URL);

header('Content-type: application/json');
curl_exec($ch);
curl_close($ch);

?>