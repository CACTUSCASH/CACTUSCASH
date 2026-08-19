#!/usr/bin/env bash
set -euo pipefail

# Mac VM provisioning script for trading bot infrastructure
# Supports UTM (Apple Silicon) and VirtualBox (Intel) backends

VM_NAME="${VM_NAME:-cactuscash-trading-vm}"
VM_CPUS="${VM_CPUS:-4}"
VM_RAM_MB="${VM_RAM_MB:-8192}"
VM_DISK_GB="${VM_DISK_GB:-64}"
BACKEND="${BACKEND:-utm}"

log() { printf "\033[1;32m[vm-setup]\033[0m %s\n" "$1"; }
err() { printf "\033[1;31m[vm-setup]\033[0m %s\n" "$1" >&2; exit 1; }

check_deps() {
  log "Checking dependencies..."
  command -v brew &>/dev/null || err "Homebrew required — install from https://brew.sh"

  if [[ "$BACKEND" == "utm" ]]; then
    if ! ls /Applications/UTM.app &>/dev/null; then
      log "Installing UTM..."
      brew install --cask utm
    fi
  else
    if ! command -v VBoxManage &>/dev/null; then
      log "Installing VirtualBox..."
      brew install --cask virtualbox
    fi
  fi
}

create_vm_utm() {
  log "Creating UTM VM: $VM_NAME"
  cat > /tmp/cactuscash-vm.utm.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Name</key><string>${VM_NAME}</string>
  <key>Architecture</key><string>aarch64</string>
  <key>CPUCount</key><integer>${VM_CPUS}</integer>
  <key>MemorySize</key><integer>${VM_RAM_MB}</integer>
  <key>DiskSize</key><integer>${VM_DISK_GB}</integer>
  <key>OperatingSystem</key><string>linux</string>
  <key>Distribution</key><string>ubuntu-24.04</string>
</dict>
</plist>
PLIST
  log "UTM VM config written to /tmp/cactuscash-vm.utm.plist"
  log "Open UTM and import this configuration, or use: utmctl create --config /tmp/cactuscash-vm.utm.plist"
}

create_vm_vbox() {
  log "Creating VirtualBox VM: $VM_NAME"
  VBoxManage createvm --name "$VM_NAME" --ostype Ubuntu_64 --register
  VBoxManage modifyvm "$VM_NAME" \
    --cpus "$VM_CPUS" \
    --memory "$VM_RAM_MB" \
    --nic1 nat \
    --natpf1 "ssh,tcp,,2222,,22" \
    --natpf1 "dashboard,tcp,,3000,,3000" \
    --natpf1 "bot-api,tcp,,8080,,8080"

  VBoxManage createmedium disk --filename "${HOME}/VMs/${VM_NAME}.vdi" \
    --size $((VM_DISK_GB * 1024))
  VBoxManage storagectl "$VM_NAME" --name "SATA" --add sata --controller IntelAhci
  VBoxManage storageattach "$VM_NAME" --storagectl "SATA" --port 0 --device 0 \
    --type hdd --medium "${HOME}/VMs/${VM_NAME}.vdi"

  log "VirtualBox VM created. Attach an Ubuntu ISO and boot."
}

provision_vm_software() {
  log "Generating VM provisioning script..."
  cat > /tmp/cactuscash-vm-provision.sh <<'PROVISION'
#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
  curl git build-essential python3 python3-pip python3-venv \
  nodejs npm chromium-browser \
  usbutils libusb-1.0-0-dev

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Flipper Zero CLI tools
pip3 install --user flipper-zero-cli qflipper-cli

# Install qFlipper (Flipper Zero companion app)
QFLIPPER_URL="https://update.flipperzero.one/builds/qFlipper/1.3.2/qFlipper-x86_64-1.3.2.AppImage"
curl -fsSL -o /usr/local/bin/qFlipper "$QFLIPPER_URL"
chmod +x /usr/local/bin/qFlipper

# udev rules for Flipper Zero USB
sudo tee /etc/udev/rules.d/42-flipperzero.rules > /dev/null <<'UDEV'
SUBSYSTEMS=="usb", ATTRS{idVendor}=="0483", ATTRS{idProduct}=="5740", MODE="0660", GROUP="plugdev", TAG+="uaccess"
UDEV
sudo udevadm control --reload-rules && sudo udevadm trigger

echo "VM provisioning complete."
PROVISION
  chmod +x /tmp/cactuscash-vm-provision.sh
  log "Provisioning script written to /tmp/cactuscash-vm-provision.sh"
  log "SCP it into the VM and run: bash /tmp/cactuscash-vm-provision.sh"
}

main() {
  log "=== CactusCash Trading VM Setup ==="
  log "Backend: $BACKEND | CPUs: $VM_CPUS | RAM: ${VM_RAM_MB}MB | Disk: ${VM_DISK_GB}GB"
  check_deps

  if [[ "$BACKEND" == "utm" ]]; then
    create_vm_utm
  else
    create_vm_vbox
  fi

  provision_vm_software
  log "=== VM setup complete ==="
  log "Next: run scripts/setup-trading-bot.sh inside the VM"
}

main "$@"
