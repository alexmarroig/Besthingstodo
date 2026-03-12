$ErrorActionPreference = "Stop"

$composeFile = "infrastructure/docker/docker-compose.yml"
$apiUrl = "http://localhost:8000"
$userProfileUrl = "http://localhost:8006"

function Wait-ForHealth {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$Retries = 30,
        [int]$DelaySeconds = 2
    )

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $resp = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
            if ($resp.status -eq "ok") {
                Write-Host "[ok] $Name health"
                return
            }
        }
        catch {
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    throw "Health check failed for $Name ($Url)"
}

function Invoke-Json {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PATCH")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [object]$Body,
        [hashtable]$Headers
    )

    $params = @{ Method = $Method; Uri = $Url; TimeoutSec = 30 }
    if ($Headers) { $params.Headers = $Headers }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod @params
}

Write-Host "Waiting for required services..."
Wait-ForHealth -Name "api" -Url "$apiUrl/health"
Wait-ForHealth -Name "user-profile-engine" -Url "$userProfileUrl/health"
Wait-ForHealth -Name "onboarding-engine" -Url "http://localhost:8008/health"
Wait-ForHealth -Name "date-night-ai" -Url "http://localhost:8009/health"
Wait-ForHealth -Name "ai-concierge" -Url "http://localhost:8007/health"

$email = "alex.c.marroig@gmail.com"
$password = "alexcamila123"
$registerPayload = @{
    email = $email
    password = $password
    account_name = "Alex & Camila"
    city = "Sao Paulo"
    neighborhood = "Campo Belo"
    country = "Brazil"
}

try {
    $token = Invoke-Json -Method POST -Url "$apiUrl/auth/register-couple" -Body $registerPayload
    Write-Host "[ok] registered couple account"
}
catch {
    $token = Invoke-Json -Method POST -Url "$apiUrl/auth/login" -Body @{ email = $email; password = $password }
    Write-Host "[ok] reused existing couple account"
}

$authHeaders = @{ Authorization = "Bearer $($token.access_token)" }
$me = Invoke-Json -Method GET -Url "$apiUrl/auth/me" -Headers $authHeaders
$userId = $me.id
Write-Host "[ok] auth/me user_id=$userId"

[void](Invoke-Json -Method POST -Url "$apiUrl/onboarding/start" -Headers $authHeaders -Body @{
    answers = @(
        @{ category = "preferred_experiences"; value = "museum"; weight = 1.0 },
        @{ category = "preferred_experiences"; value = "cinema"; weight = 1.0 },
        @{ category = "preferred_restaurants"; value = "quiet restaurant"; weight = 1.0 },
        @{ category = "favorite_movie_genres"; value = "mystery"; weight = 1.0 },
        @{ category = "quiet_social"; value = "quiet"; weight = 1.0 },
        @{ category = "romantic_group"; value = "romantic"; weight = 1.0 },
        @{ category = "budget_range"; value = "medium"; weight = 1.0 }
    )
})
Write-Host "[ok] onboarding answers submitted"

[void](Invoke-Json -Method PATCH -Url "$apiUrl/onboarding/couple/step" -Headers $authHeaders -Body @{
    step_key = "lifestyle"
    data = @{
        avoid_crowded_places = $true
        avoid_bar = $true
        avoid_nightclub = $true
        preferences = @("romantic", "small", "cozy")
    }
})
Write-Host "[ok] couple lifestyle patched"

[void](Invoke-Json -Method POST -Url "$userProfileUrl/profiles/generate" -Body @{ user_id = $userId })
Write-Host "[ok] user profile generated"

$sql = @"
DELETE FROM experiences WHERE source = 'smoke_validation';
INSERT INTO experiences (
    id, title, description, category, domain, city, location, latitude, longitude,
    start_time, price, tags, source, url, created_at
)
VALUES
    (
        'smoke-dining',
        'Lellis Trattoria - jantar romantico',
        'Mesa tranquila para casal e pratos italianos.',
        'restaurant',
        'dining_out',
        'Sao Paulo',
        'Bela Vista',
        -23.5614,
        -46.6559,
        NOW(),
        220.0,
        '["romantic","cozy","italian","quiet"]'::jsonb,
        'smoke_validation',
        'https://example.com/lellis',
        NOW()
    ),
    (
        'smoke-delivery',
        'Patties Delivery Night',
        'Cheeseburger e batatas para noite de chuva.',
        'delivery',
        'delivery',
        'Sao Paulo',
        'Campo Belo',
        -23.6250,
        -46.6680,
        NOW(),
        85.0,
        '["delivery","burger","rain_friendly","cozy"]'::jsonb,
        'smoke_validation',
        'https://example.com/patties',
        NOW()
    ),
    (
        'smoke-movie',
        'Movie Night - Plot Twist Collection',
        'Selecao de filmes com misterio e plot twist.',
        'movie',
        'movies_series',
        'Sao Paulo',
        'Home streaming',
        -23.6250,
        -46.6680,
        NOW(),
        0.0,
        '["mystery","psychological thriller","plot twist","indoor"]'::jsonb,
        'smoke_validation',
        'https://example.com/movie-night',
        NOW()
    ),
    (
        'smoke-culture',
        'Exposicao de Psicologia Contemporanea',
        'Instalacao artistica inspirada em psicologia.',
        'exhibition',
        'events_exhibitions',
        'Sao Paulo',
        'Pinheiros',
        -23.5614,
        -46.6559,
        NOW(),
        70.0,
        '["psychology exhibitions","art installations","museum events","indoor"]'::jsonb,
        'smoke_validation',
        'https://example.com/exposicao',
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    domain = EXCLUDED.domain,
    city = EXCLUDED.city,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    start_time = EXCLUDED.start_time,
    price = EXCLUDED.price,
    tags = EXCLUDED.tags,
    source = EXCLUDED.source,
    url = EXCLUDED.url,
    created_at = EXCLUDED.created_at;
"@

$sql | docker compose -f $composeFile exec -T postgres psql -v ON_ERROR_STOP=1 -U life -d life_discovery | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to seed smoke-test experiences in Postgres"
}
Write-Host "[ok] smoke experiences seeded"

$couple = Invoke-Json -Method GET -Url "$apiUrl/couple/me" -Headers $authHeaders
Write-Host "[ok] couple/me account=$($couple.account_name) members=$($couple.members.Count)"

Write-Host "Smoke seed complete."
Write-Host "email=$email"
Write-Host "password=$password"
Write-Host "user_id=$userId"
