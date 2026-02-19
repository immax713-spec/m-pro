import json, urllib.request
url = "https://script.google.com/macros/s/AKfycbw4EObG7yK_Jm5k3vct_BMaWBd-d4NY14U2UXetJKF_XWoYeyUq6vpDIV6WhfKGSWw-Hw/exec"
with urllib.request.urlopen(url) as resp:
    data = json.load(resp)
print('progress len', len(data['progress']))
for item in data['progress'][:10]:
    print(item)
