#!/bin/bash -xe
IP=$( jq -r '.IP' /etc/config.json )

sed -i "s/IP_ADDRESS/$IP/g" /etc/asterisk/pjsip.conf

groupadd asterisk
useradd -r -d /var/lib/asterisk -g asterisk asterisk
usermod -aG audio,dialout asterisk
chown -R asterisk.asterisk /etc/asterisk
chown -R asterisk.asterisk /var/{lib,log,spool}/asterisk

echo '0 * * * * /sbin/asterisk -rx "core reload"' > /etc/asterisk/crontab.txt 
crontab /etc/asterisk/crontab.txt


systemctl start asterisk