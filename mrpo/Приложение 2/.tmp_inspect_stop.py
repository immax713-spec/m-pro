import json, urllib.request
url = "https://script.google.com/macros/s/AKfycbw4EObG7yK_Jm5k3vct_BMaWBd-d4NY14U2UXetJKF_XWoYeyUq6vpDIV6WhfKGSWw-Hw/exec"
with urllib.request.urlopen(url) as resp:
    data = json.load(resp)
for idx, item in enumerate(data['progress']):
    if isinstance(item['name'], str) and item['name'].lower().startswith('stop'):
        print('stop marker at index', idx)
        break
else:
    print('stop not found')
