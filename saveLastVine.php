<?php 

$buffer_name = isset($_GET['buffer']) ? $_GET['buffer'] : 'buffer_0';

define('VINE_URL', 'http://vinepeek.com/videos');

$ch = curl_init(VINE_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$vine_json = curl_exec($ch);
curl_close($ch);

if ($vine_json){
    $vine_json = json_decode($vine_json);

    if ($vine_json && $vine_json->video_url){
        $ch = curl_init($vine_json->video_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $video = curl_exec($ch);        
        curl_close($ch);

        file_put_contents($buffer_name . '.mp4', $video);

        header('HTTP/1.0 201 Created');
        exit;
    }    
}

header('HTTP/1.0 500 Internal Server Error')


 ?>