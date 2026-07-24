import json, sys

wf = json.load(open(sys.argv[1]))

for n in wf['nodes']:
    if n['name'] == 'Build R2 Payload':
        n['parameters']['jsCode'] = """const jobData = $('Generate Job ID').first().json;
const payload = {
  success: true,
  topic_id: jobData.topic_id,
  topic_name: jobData.topic_name,
  cardCount: jobData.count
};
const jsonBuffer = Buffer.from(JSON.stringify(payload));

return [{
  json: { jobId: jobData.jobId },
  binary: {
    data: await this.helpers.prepareBinaryData(
      jsonBuffer, 'result.json', 'application/json'
    )
  }
}];"""
        
    elif n['name'] == 'Save Result to R2':
        # Now that we are passing jobId in json from previous node, we can just use $json.jobId
        n['parameters']['fileName'] = '=jobs/{{ $json.jobId }}.json'

json.dump(wf, open(sys.argv[2], 'w'), indent=2)
print("Binary data fix applied!")
