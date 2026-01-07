# Deployment Guide for Hetzner VPS

This guide will help you deploy your Sound Therapy app to a Hetzner VPS for cost-effective long-running sessions.

## Prerequisites

- Hetzner VPS (Ubuntu 20.04/22.04 recommended)
- Domain name (optional but recommended for SSL)
- SSH access to your VPS

## Step 1: Initial Server Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18+ (for building)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install nginx
apt install -y nginx

# Install certbot for SSL
apt install -y certbot python3-certbot-nginx
```

## Step 2: Build and Transfer Files

On your local machine (or Replit):

```bash
# Build the app
npm install
npm run build

# Create a tarball
tar -czf sound-therapy.tar.gz dist/ public/

# Transfer to VPS
scp sound-therapy.tar.gz root@your-vps-ip:/tmp/
```

On your VPS:

```bash
# Create app directory
mkdir -p /var/www/sound-therapy

# Extract files
cd /var/www/sound-therapy
tar -xzf /tmp/sound-therapy.tar.gz

# Copy public folder contents to dist (Vite should handle this, but verify)
# The public folder should be copied during build, but verify dist/ has all assets

# Set permissions
chown -R www-data:www-data /var/www/sound-therapy
chmod -R 755 /var/www/sound-therapy
```

## Step 3: Configure Nginx

```bash
# Copy nginx config
sudo nano /etc/nginx/sites-available/sound-therapy
# Paste the contents of nginx.conf, update domain name

# Enable the site
sudo ln -s /etc/nginx/sites-available/sound-therapy /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 4: Set Up SSL (Recommended)

```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically update your nginx config
# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 5: Firewall Setup

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 6: Verify Deployment

1. Visit `http://your-vps-ip` or `https://your-domain.com`
2. Test audio playback
3. Test long-running sessions (5+ hours)

## Maintenance

### Update the App

```bash
# On local machine: build and transfer
npm run build
tar -czf sound-therapy.tar.gz dist/ public/
scp sound-therapy.tar.gz root@your-vps-ip:/tmp/

# On VPS: extract and restart
cd /var/www/sound-therapy
tar -xzf /tmp/sound-therapy.tar.gz
chown -R www-data:www-data /var/www/sound-therapy
sudo systemctl reload nginx
```

### Monitor Logs

```bash
# Nginx access logs
sudo tail -f /var/log/nginx/sound-therapy-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/sound-therapy-error.log
```

## Cost Comparison

**Replit:**
- ~$7-20/month for Hacker plan
- Bandwidth costs for large audio files
- Can get expensive with 5+ hour sessions

**Hetzner VPS:**
- ~€4-6/month for basic VPS (CPX11/CPX21)
- Unlimited bandwidth
- Full control
- Much cheaper for long-running sessions

## Troubleshooting

### Audio files not loading
- Check file permissions: `ls -la /var/www/sound-therapy/dist/`
- Check nginx error logs: `sudo tail -f /var/log/nginx/sound-therapy-error.log`
- Verify files exist: `find /var/www/sound-therapy -name "*.mp3"`

### 404 errors
- Ensure `try_files` in nginx config includes `/index.html`
- Check that dist folder has all files

### SSL issues
- Verify certbot ran successfully: `sudo certbot certificates`
- Check nginx config: `sudo nginx -t`

