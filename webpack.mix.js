const mix = require('laravel-mix');

mix.js('src/js/htmlvideo.js', 'dist/js')
    .sass('src/sass/main.scss', 'dist/css');
