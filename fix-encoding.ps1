$files = @(
  'C:\TIAGO\OneDrive\ESTUDOS\Claude.AI\corretor-imoveis-inteligente\apps\web\src\app\dashboard\page.tsx',
  'C:\TIAGO\OneDrive\ESTUDOS\Claude.AI\corretor-imoveis-inteligente\apps\web\src\app\dashboard\imoveis\page.tsx',
  'C:\TIAGO\OneDrive\ESTUDOS\Claude.AI\corretor-imoveis-inteligente\apps\web\src\app\dashboard\matches\page.tsx',
  'C:\TIAGO\OneDrive\ESTUDOS\Claude.AI\corretor-imoveis-inteligente\apps\web\src\app\dashboard\perfis\page.tsx',
  'C:\TIAGO\OneDrive\ESTUDOS\Claude.AI\corretor-imoveis-inteligente\apps\web\src\app\page.tsx'
)

$replacements = [ordered]@{
  'Ã§Ã£o' = 'ção'
  'Ã§Ãµes' = 'ções'
  'Ã¡ria' = 'ária'
  'Ã¡rios' = 'ários'
  'Ã£o' = 'ão'
  'Ãµes' = 'ões'
  'Ã§' = 'ç'
  'Ã¡' = 'á'
  'Ã©' = 'é'
  'Ã³' = 'ó'
  'Ã­' = 'í'
  'Ãº' = 'ú'
  'Ã¢' = 'â'
  'Ãª' = 'ê'
  'Ã´' = 'ô'
  'Ã ' = 'à'
  'Ã¼' = 'ü'
  'Ãµ' = 'õ'
  'Ã£' = 'ã'
  'Ã‰' = 'É'
  'Ã‡' = 'Ç'
  'Ã"' = 'Ó'
  'Ãš' = 'Ú'
  'Ã€' = 'À'
  'Ãƒ' = 'Ã'
  'Ã‚' = 'Â'
  'â€"' = [char]0x2014
  'â€™' = [char]0x2019
  'â€œ' = [char]0x201C
  'â€' = [char]0x201D
  'âœ"' = [char]0x2713
  'â†'' = [char]0x2192
  'Âº' = [char]0x00BA
  'Â°' = [char]0x00B0
  'Â²' = [char]0x00B2
  'Â³' = [char]0x00B3
  'Â·' = [char]0x00B7
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
  $original = $content
  foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
  }
  [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
  $changed = if ($content -ne $original) { 'CORRIGIDO' } else { 'sem alteracao' }
  Write-Host "$changed : $([System.IO.Path]::GetFileName($file))"
}
Write-Host 'Pronto!'
