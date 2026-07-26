#!/usr/bin/env bash
# ============================================
# ayantaraz — Server Setup Redirect
# ============================================
# This file is kept for backward compatibility.
# Use: sudo bash bootstrap.sh
# ============================================
echo "⚠️  This script has been replaced by bootstrap.sh"
echo ""
echo "Run: sudo bash bootstrap.sh"
echo ""
exec bash "$(dirname "$0")/bootstrap.sh" "$@"
