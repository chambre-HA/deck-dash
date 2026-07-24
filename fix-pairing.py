import json, sys

wf = json.load(open(sys.argv[1]))

for n in wf['nodes']:
    if n['name'] == 'Save Result to R2':
        n['parameters']['fileName'] = '=jobs/{{ $(\'Generate Job ID\').first().json.jobId }}.json'
    elif n['name'] == 'Build R2 Payload':
        n['parameters']['jsCode'] = "const jobData = $('Generate Job ID').first().json;\nreturn {\n  json: {\n    success: true,\n    topic_id: jobData.topic_id,\n    topic_name: jobData.topic_name,\n    cardCount: jobData.count\n  }\n};"

json.dump(wf, open(sys.argv[2], 'w'), indent=2)
print("done")
