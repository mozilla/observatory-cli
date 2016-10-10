FROM alpine:latest
MAINTAINER https://github.com/mozilla/observatory-cli

## Reason for sed command is https://github.com/mozilla/observatory-cli/issues/20
RUN adduser -h /home/observatory -g "Observatory CLI User" -s /bin/ash -D observatory
RUN apk --update add nodejs && \
  rm -rf /var/cache/apk/* && \
  npm install -g observatory-cli && \
  sed -i 's;/usr/bin/env node;/usr/bin/node;g' /usr/lib/node_modules/observatory-cli/index.js

USER observatory
WORKDIR /home/observatory
ENTRYPOINT ["observatory"]
CMD ["--help"]
