# PowerShell script to generate icons for PasteMyPrompt
# Run: .\generate-icons.ps1

$iconsDir = "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

# Function to create a simple PNG icon using .NET
function Create-Icon {
    param([int]$Size, [string]$FilePath)
    
    # Create a bitmap
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Set high quality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Create coral/orange gradient background
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($Size, $Size)),
        [System.Drawing.Color]::FromArgb(255, 107, 107),
        [System.Drawing.Color]::FromArgb(255, 169, 77)
    )
    $graphics.FillRectangle($brush, 0, 0, $Size, $Size)
    
    # Draw PM text (PasteMyPrompt)
    $font = New-Object System.Drawing.Font("Arial", ($Size * 0.45), [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString("PM", $font, $textBrush, ($Size / 2), ($Size / 2), $format)
    
    # Save
    $bitmap.Save($FilePath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
}

try {
    Add-Type -AssemblyName System.Drawing
    
    Write-Host "Generating icons..." -ForegroundColor Green
    
    Create-Icon -Size 16 -FilePath "$iconsDir\icon16.png"
    Write-Host "Created icon16.png" -ForegroundColor Green
    
    Create-Icon -Size 48 -FilePath "$iconsDir\icon48.png"
    Write-Host "Created icon48.png" -ForegroundColor Green
    
    Create-Icon -Size 128 -FilePath "$iconsDir\icon128.png"
    Write-Host "Created icon128.png" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "All icons generated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error: Could not generate icons automatically." -ForegroundColor Red
    Write-Host "Please use generate-icons.html in your browser instead." -ForegroundColor Yellow
}
